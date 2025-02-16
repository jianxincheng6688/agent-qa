import { NextResponse } from "next/server"
import { PythonShell, type Options as PythonShellOptions } from "python-shell"
import path from "path"

export const maxDuration = 300

interface QAResult {
  answer: string
  references: string[]
}

export async function POST(req: Request) {
  try {
    const { topic, question } = await req.json()

    const folderMap: { [key: string]: string } = {
      "biomechanics-spacetime": "生物力学时空文件夹",
      "biomechanics-space": "生物力学空间文件夹",
      "biomechanics-quantitative": "生物力学定量特性文件夹",
      "biomechanics-characteristics": "生物力学特性文件夹",
    }

    const folderName = folderMap[topic]
    if (!folderName) {
      return NextResponse.json({ error: "无效的主题" }, { status: 400 })
    }

    const folderPath = path.join(process.cwd(), folderName)

    const options: PythonShellOptions = {
      mode: "text" as const,
      pythonPath: "python",
      pythonOptions: ["-u"],
      scriptPath: "scripts",
      args: [folderPath, question],
      timeout: 300000,
    }

    console.log("开始执行Python脚本...")
    console.log("文件夹路径:", folderPath)
    console.log("问题:", question)

    const result = await new Promise<QAResult>((resolve, reject) => {
      let finalResult: QAResult | null = null
      const pyshell = new PythonShell("paper_qa.py", options)

      let jsonBuffer = ""
      pyshell.on("message", (message) => {
        console.log("Python输出:", message)
        jsonBuffer += message

        // Try to parse complete JSON objects
        while (jsonBuffer.includes("\n")) {
          const newlineIndex = jsonBuffer.indexOf("\n")
          const jsonString = jsonBuffer.slice(0, newlineIndex)
          jsonBuffer = jsonBuffer.slice(newlineIndex + 1)

          try {
            const jsonOutput = JSON.parse(jsonString)
            if (jsonOutput.log) {
              console.log("Python日志:", jsonOutput.log)
            } else if (jsonOutput.result) {
              finalResult = jsonOutput.result
            } else if (jsonOutput.error) {
              throw new Error(jsonOutput.error)
            }
          } catch (e) {
            console.error("解析Python输出时出错:", e)
          }
        }
      })

      pyshell.end((err) => {
        if (err) {
          console.error("Python脚本执行错误:", err)
          reject(err)
        } else {
          console.log("Python脚本执行完成")
          if (jsonBuffer) {
            try {
              const jsonOutput = JSON.parse(jsonBuffer)
              if (jsonOutput.result) {
                finalResult = jsonOutput.result
              }
            } catch (e) {
              console.error("解析剩余Python输出时出错:", e)
            }
          }
          if (finalResult) {
            resolve(finalResult)
          } else {
            reject(new Error("未能获取有效结果"))
          }
        }
      })

      setTimeout(() => {
        pyshell.terminate()
        reject(new Error("处理超时，请稍后重试"))
      }, options.timeout)
    })

    console.log("Python脚本执行完成，结果:", result)

    if (result && typeof result === "object" && "answer" in result) {
      return NextResponse.json(result)
    } else {
      throw new Error("无效的结果格式")
    }
  } catch (error) {
    console.error("处理请求时出错:", error)
    return NextResponse.json({ error: "处理请求时出错: " + (error as Error).message }, { status: 500 })
  }
}

