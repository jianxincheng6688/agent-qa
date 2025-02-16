import sys
import json
import os
from sentence_transformers import SentenceTransformer
import torch
import traceback
import chardet
import codecs
import re
from pdfminer.high_level import extract_text
from openai import OpenAI
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 初始化OpenAI客户端
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

def log(message):
    print(json.dumps({"log": message}, ensure_ascii=False), flush=True)

def detect_encoding(file_path):
    with open(file_path, 'rb') as file:
        raw_data = file.read()
    return chardet.detect(raw_data)['encoding']

class OfflineQASystem:
    def __init__(self):
        log("正在初始化问答系统...")
        self.encoder = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2', device='cpu')
        log("初始化完成")

    def read_documents(self, folder_path):
        documents = []
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            try:
                if filename.endswith(('.txt', '.md')):
                    encoding = detect_encoding(file_path)
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                elif filename.endswith('.pdf'):
                    content = extract_text(file_path)
                else:
                    continue  # Skip unsupported file types

                documents.append({
                    'content': content,
                    'source': filename
                })
                log(f"成功读取文件: {filename}")
            except Exception as e:
                log(f"读取文件 {filename} 时出错: {str(e)}")
        return documents

    def count_keyword(self, documents, keyword):
        total_count = 0
        for doc in documents:
            count = len(re.findall(r'\b' + re.escape(keyword) + r'\b', doc['content'], re.IGNORECASE))
            total_count += count
        return total_count

    def find_relevant_passages(self, question, documents, top_k=3):
        question_embedding = self.encoder.encode(question, convert_to_tensor=True)
        passages = []
        
        for doc in documents:
            paragraphs = doc['content'].split('\n\n')
            for para in paragraphs:
                if len(para.strip()) > 50:
                    passages.append({
                        'content': para,
                        'source': doc['source']
                    })
        
        if not passages:
            return []
        
        passage_embeddings = self.encoder.encode([p['content'] for p in passages], convert_to_tensor=True)
        similarities = torch.cosine_similarity(question_embedding, passage_embeddings)
        top_indices = similarities.argsort(descending=True)[:top_k]
        return [passages[idx] for idx in top_indices]

    def answer_question(self, question, folder_path):
        try:
            documents = self.read_documents(folder_path)
            if not documents:
                return {
                    "answer": "未找到任何可读取的文档。请确保文件夹中包含 .txt, .md 或 .pdf 文件。",
                    "references": []
                }
            
            # Check if the question is about keyword count
            keyword_match = re.search(r'(\w+)这一关键词出现的次数是多少', question)
            if keyword_match:
                keyword = keyword_match.group(1)
                count = self.count_keyword(documents, keyword)
                return {
                    "answer": f"关键词 '{keyword}' 在所有文档中共出现了 {count} 次。",
                    "references": [doc['source'] for doc in documents]
                }
            
            relevant_passages = self.find_relevant_passages(question, documents)
            if not relevant_passages:
                return {
                    "answer": "未找到相关内容。",
                    "references": []
                }
            
            # 使用OpenAI API来回答问题
            context = "\n".join([p['content'] for p in relevant_passages])
            prompt = f"基于以下内容回答问题：\n\n{context}\n\n问题：{question}\n\n回答："

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "你是一个专业的问答助手，请基于给定的上下文信息回答问题。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                n=1,
                temperature=0.5,
            )

            answer = response.choices[0].message.content.strip()
            
            return {
                "answer": answer,
                "references": [f"来源: {p['source']}" for p in relevant_passages]
            }
            
        except Exception as e:
            log(f"处理问题时出错: {str(e)}")
            log(traceback.format_exc())
            return {
                "error": str(e),
                "references": []
            }

def query_docs(folder_path, question):
    try:
        qa_system = OfflineQASystem()
        result = qa_system.answer_question(question, folder_path)
        print(json.dumps({"result": result}, ensure_ascii=False), flush=True)
    except Exception as e:
        log(f"发生错误: {str(e)}")
        log(traceback.format_exc())
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }, ensure_ascii=False), flush=True)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "需要提供文件夹路径和问题"}, ensure_ascii=False), flush=True)
    else:
        folder_path = sys.argv[1]
        question = sys.argv[2]
        query_docs(folder_path, question)

