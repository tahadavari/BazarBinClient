import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Loader2, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Dataset = {
  id: number
  schemaName: string
  tableName: string
  importedAt: string
}

const DATASETS_ENDPOINT = "http://localhost:5275/datasets"

export default function DatasetListPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDatasets = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(DATASETS_ENDPOINT, { signal })
        if (!response.ok) {
          throw new Error(`خطا در دریافت داده‌ها: ${response.status}`)
        }

        const data = (await response.json()) as Dataset[]
        if (!Array.isArray(data)) {
          throw new Error("ساختار پاسخ دریافتی نامعتبر است")
        }

        setDatasets(data)
      } catch (fetchError) {
        const errorObject = fetchError as Error
        if (errorObject.name === "AbortError") {
          return
        }

        console.error(fetchError)
        setError("خطایی در دریافت لیست دیتاست‌ها رخ داد. لطفا دوباره تلاش کنید.")
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadDatasets(controller.signal)

    return () => {
      controller.abort()
    }
  }, [loadDatasets])

  const handleRefreshClick = () => {
    void loadDatasets()
  }

  const formattedDatasets = useMemo(
    () =>
      datasets.map((dataset) => ({
        ...dataset,
        importedAtLabel: formatDateTime(dataset.importedAt),
      })),
    [datasets]
  )

  const isEmptyState = !isLoading && !error && formattedDatasets.length === 0

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-muted/40 to-background">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-12 sm:px-6 lg:px-12">
        <header className="flex flex-col gap-3 text-right">
          <p className="text-sm font-medium text-primary">دیتاست‌های شما</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            مدیریت دیتاست‌ها
          </h1>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            لیست دیتاست‌های درون‌ریزی شده را مشاهده کنید و دیتاست‌های جدید بسازید.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-right">
            <h2 className="text-lg font-semibold text-foreground">لیست دیتاست‌ها</h2>
            <p className="text-sm text-muted-foreground">این لیست به صورت خودکار از سرور خوانده می‌شود.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefreshClick} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              تازه‌سازی
            </Button>
            <Button asChild className="gap-2">
              <Link to="/create">
                <ArrowLeft className="h-4 w-4" />
                ایجاد دیتاست جدید
              </Link>
            </Button>
          </div>
        </div>

        <Card className="border-border/70 shadow-lg shadow-primary/5 supports-[backdrop-filter]:backdrop-blur-sm">
          <CardHeader className="text-right">
            <CardTitle>لیست دیتاست‌ها</CardTitle>
            <CardDescription>آخرین دیتاست‌های درون‌ریزی شده در سیستم</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> در حال دریافت اطلاعات...
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center text-destructive">
                <p>{error}</p>
                <Button onClick={handleRefreshClick} variant="destructive" className="gap-2">
                  <RefreshCcw className="h-4 w-4" /> تلاش مجدد
                </Button>
              </div>
            ) : isEmptyState ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center text-muted-foreground">
                <p>هنوز دیتاستی ثبت نشده است. برای شروع روی «ایجاد دیتاست جدید» کلیک کنید.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-right">شناسه</TableHead>
                    <TableHead className="text-right">نام شِما</TableHead>
                    <TableHead className="text-right">نام جدول</TableHead>
                    <TableHead className="text-right">تاریخ درون‌ریزی</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formattedDatasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="text-right font-medium">{dataset.id}</TableCell>
                      <TableCell className="text-right">{dataset.schemaName}</TableCell>
                      <TableCell className="text-right">{dataset.tableName}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{dataset.importedAtLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function formatDateTime(value: string) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)
}
