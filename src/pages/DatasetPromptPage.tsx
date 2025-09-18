import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import { ArrowLeft, Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DATASETS_ENDPOINT, buildDatasetPromptEndpoint } from "@/lib/api"

type DatasetSummary = {
  id: number
  schemaName: string
  tableName: string
  importedAt: string
  importedAtLabel?: string
}

type PromptResponse = {
  response?: string
  promptWithSchema?: string
}

type LocationState = {
  dataset?: DatasetSummary
}

export default function DatasetPromptPage() {
  const { datasetId } = useParams<{ datasetId: string }>()
  const location = useLocation()
  const locationState = (location.state as LocationState | null) ?? undefined
  const initialDataset = locationState?.dataset

  const [dataset, setDataset] = useState<DatasetSummary | null>(initialDataset ?? null)
  const [isDatasetLoading, setIsDatasetLoading] = useState(!initialDataset)
  const [datasetError, setDatasetError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!datasetId) {
      setDatasetError("شناسه دیتاست نامعتبر است.")
      setIsDatasetLoading(false)
      return
    }

    if (initialDataset) {
      return
    }

    const controller = new AbortController()

    const fetchDataset = async () => {
      setIsDatasetLoading(true)
      setDatasetError(null)

      try {
        const res = await fetch(DATASETS_ENDPOINT, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Failed to load datasets: ${res.status}`)
        }

        const data = (await res.json()) as DatasetSummary[]
        const found = data.find((item) => String(item.id) === datasetId)
        if (found) {
          setDataset(found)
        } else {
          setDatasetError("دیتاست مورد نظر پیدا نشد.")
        }
      } catch (error) {
        const err = error as Error
        if (err.name === "AbortError") {
          return
        }
        console.error(error)
        setDatasetError("در بارگذاری دیتاست خطایی رخ داد. لطفاً دوباره تلاش کنید.")
      } finally {
        if (!controller.signal.aborted) {
          setIsDatasetLoading(false)
        }
      }
    }

    void fetchDataset()

    return () => {
      controller.abort()
    }
  }, [datasetId, initialDataset])

  const datasetTitle = useMemo(() => {
    if (dataset) {
      return `${dataset.schemaName}.${dataset.tableName}`
    }
    if (!datasetId) {
      return "دیتاست"
    }
    return `دیتاست شماره ${datasetId}`
  }, [dataset, datasetId])

  if (!datasetId) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      setSubmitError("لطفاً متن پرامپت را وارد کنید.")
      return
    }

    setResponse(null)
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(buildDatasetPromptEndpoint(datasetId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      })

      if (!res.ok) {
        throw new Error(`Prompt request failed: ${res.status}`)
      }

      const data = (await res.json()) as PromptResponse
      if (typeof data.response === "string" && data.response.length > 0) {
        setResponse(data.response)
      } else {
        setResponse(null)
        setSubmitError("????? ?? ????? ?????? ???.")
      }
    } catch (error) {
      console.error(error)
      setSubmitError("در ارسال پرامپت خطایی رخ داد. لطفاً دوباره تلاش کنید.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-muted/40 to-background">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-12 sm:px-6 lg:px-12">
        <div className="flex items-center justify-between gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-primary">پاسخ هوش مصنوعی برای دیتاست انتخاب‌شده</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{datasetTitle}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              پرامپت موردنظر خود را ثبت کنید تا پاسخ بر اساس داده‌های این دیتاست تولید شود. هنگام پردازش پاسخ، امکان ویرایش فیلد پرامپت غیرفعال خواهد شد.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> بازگشت به فهرست دیتاست‌ها
            </Link>
          </Button>
        </div>

        <Card className="border-border/70 shadow-lg shadow-primary/5 supports-[backdrop-filter]:backdrop-blur-sm">
          <CardHeader className="text-right">
            <CardTitle>ارسال پرامپت</CardTitle>
            <CardDescription>متن پرامپت را بنویسید و آن را برای دریافت پاسخ ارسال کنید.</CardDescription>
          </CardHeader>
          <CardContent>
            {isDatasetLoading ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>در حال دریافت اطلاعات دیتاست...</p>
              </div>
            ) : datasetError ? (
              <p className="text-sm text-destructive">{datasetError}</p>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="prompt">متن پرامپت</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="مثلاً: محصولات با بیشترین فروش را فهرست کن"
                    rows={8}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">پاسخ بر اساس داده‌های همین دیتاست محاسبه می‌شود.</p>
                </div>

                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    ارسال پرامپت
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {response ? (
          <Card className="border-border/70 shadow-md">
            <CardHeader className="text-right">
              <CardTitle>پاسخ تولید شده</CardTitle>
              <CardDescription>متن زیر با فرمت مارک‌داون رندر شده است.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="markdown-body text-right text-sm leading-7 sm:text-base">
                <ReactMarkdown>{response}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  )
}
