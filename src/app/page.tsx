"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Brain } from "lucide-react"

const topics = [
  { value: "biomechanics-spacetime", label: "生物力学时空" },
  { value: "biomechanics-space", label: "生物力学空间" },
  { value: "biomechanics-quantitative", label: "生物力学定量特性" },
  { value: "biomechanics-characteristics", label: "生物力学特征" },
]

export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState(topics[0].value)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [references, setReferences] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setAnswer("")
    setReferences([])
    try {
      const response = await fetch("/api/qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: selectedTopic, question }),
      })
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setAnswer(data.answer)
      setReferences(data.references || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理请求时出错")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isMounted) {
    return null // 或者返回一个加载指示器
  }

  return (
    <div
      className="flex min-h-screen bg-gray-50 items-center justify-center p-4"
      style={{ minHeight: "100vh", width: "100vw" }}
    >
      <div className="w-full max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">生物力学智能问答系统</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择主题" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.value} value={topic.value}>
                        {topic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="请输入您的问题"
                disabled={isLoading}
              />

              <Button type="submit" className="w-full" disabled={isLoading || !question.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "提交问题"
                )}
              </Button>
            </form>

            {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

            {answer && (
              <div className="mt-6 space-y-4">
                <h2 className="text-lg font-semibold">回答：</h2>
                <p className="text-gray-700 bg-white p-3 rounded-md shadow-sm">{answer}</p>
                {references.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mt-2">参考文献：</h3>
                    <ul className="list-disc pl-5 text-sm text-gray-600 mt-1">
                      {references.map((ref, index) => (
                        <li key={index}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

