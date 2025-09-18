import type {ChangeEvent} from "react"
import {useEffect, useMemo, useRef, useState} from "react"
import type {CheckedState} from "@radix-ui/react-checkbox"
import {Eye, FileText, Upload} from "lucide-react"

import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Checkbox} from "@/components/ui/checkbox"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Switch} from "@/components/ui/switch"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {Textarea} from "@/components/ui/textarea"
import {parseCsv} from "@/lib/csv"
import type {PostgresDataType} from "@/lib/postgres"
import {getIdentifierError, inferPostgresType, POSTGRES_DATA_TYPES, sanitizeIdentifier,} from "@/lib/postgres"

type ColumnConfig = {
    id: string
    headerLabel: string
    sourceName: string
    sampleValues: string[]
    include: boolean
    tableColumnName: string
    autoColumnName: string
    isNameDirty: boolean
    comment: string
    dataType: PostgresDataType
    autoType: PostgresDataType
    isTypeDirty: boolean
}

const MAX_PREVIEW_ROWS = 15

export default function CreateDatasetPage() {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [rawData, setRawData] = useState<string[][]>([])
    const [delimiter, setDelimiter] = useState<string>(",")
    const [parseError, setParseError] = useState<string>("")
    const [isParsing, setIsParsing] = useState(false)

    const [useFirstRowAsHeader, setUseFirstRowAsHeader] = useState(true)

    const [columns, setColumns] = useState<ColumnConfig[]>([])

    const [tableName, setTableName] = useState("")
    const [tableComment, setTableComment] = useState("")

    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    const tableNameError = useMemo(() => getIdentifierError(tableName), [tableName])
    const preparedHeader = useMemo(() => {
        if (!rawData.length) {
            return [] as string[]
        }
        if (useFirstRowAsHeader) {
            return rawData[0]?.map((cell) => cell?.trim?.() ?? "") ?? []
        }
        return columns.map((column, index) => column.headerLabel || `ستون ${index + 1}`)
    }, [columns, rawData, useFirstRowAsHeader])

    const previewRows = useMemo(() => {
        if (!rawData.length) {
            return [] as string[][]
        }
        const dataRows = useFirstRowAsHeader ? rawData.slice(1) : rawData
        return dataRows.slice(0, MAX_PREVIEW_ROWS)
    }, [rawData, useFirstRowAsHeader])

    useEffect(() => {
        if (!rawData.length) {
            setColumns([])
            return
        }

        setColumns((previousColumns) => buildColumns(rawData, useFirstRowAsHeader, previousColumns))
    }, [rawData, useFirstRowAsHeader])

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] ?? null
        if (!selectedFile) {
            return
        }

        setFile(selectedFile)
        setParseError("")
        setIsParsing(true)

        try {
            const text = await selectedFile.text()
            const parsed = parseCsv(text)
            setDelimiter(parsed.delimiter)
            setRawData(parsed.rows)

            const baseName = selectedFile.name.replace(/\.[^.]+$/u, "")
            const suggestedTableName = sanitizeIdentifier(baseName, "table")
            setTableName(suggestedTableName)
        } catch (error) {
            console.error(error)
            setParseError("خطایی در خواندن فایل رخ داد. لطفا دوباره تلاش کنید.")
            setRawData([])
            setColumns([])
        } finally {
            setIsParsing(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const clearFile = () => {
        setFile(null)
        setRawData([])
        setColumns([])
        setDelimiter(",")
        setParseError("")
        setTableName("")
    }

    const selectedColumnCount = useMemo(
        () => columns.filter((column) => column.include).length,
        [columns]
    )

    return (
        <main className="min-h-screen bg-gradient-to-b from-background via-muted/40 to-background">
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-12 sm:px-6 lg:px-12">
                <header className="flex flex-col gap-3 text-right">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        درون‌ریزی CSV به پایگاه داده
                    </h1>
                    <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                        فایل CSV خود را انتخاب کنید، تنظیمات ستون‌ها را بررسی کنید و برای بارگذاری در PostgreSQL آماده
                        شوید.
                    </p>
                </header>

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <Card
                        className="h-fit border-border/70 shadow-lg shadow-primary/5 supports-[backdrop-filter]:backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <Upload className="h-4 w-4"/> انتخاب فایل CSV
                            </CardTitle>
                            <CardDescription>
                                فایل را انتخاب کنید و پیش‌نمایش داده‌ها را در یک مدال مشاهده کنید.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={handleFileChange}
                                    disabled={isParsing}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!rawData.length}
                                    onClick={() => setIsPreviewOpen(true)}
                                >
                                    <Eye className="h-4 w-4"/> نمایش پیش‌نمایش
                                </Button>
                                {file && (
                                    <Button type="button" variant="ghost" onClick={clearFile}>
                                        حذف فایل
                                    </Button>
                                )}
                            </div>
                            {isParsing && (
                                <p className="text-sm text-muted-foreground">در حال پردازش فایل...</p>
                            )}
                            {parseError && <p className="text-sm text-destructive">{parseError}</p>}

                            {file && (
                                <div className="rounded-lg border border-dashed bg-background p-4 text-sm">
                                    <div className="flex items-center gap-2 font-medium">
                                        <FileText className="h-4 w-4"/> {file.name}
                                    </div>
                                    <dl className="mt-2 grid gap-1 text-muted-foreground">
                                        <div className="flex justify-between">
                                            <dt>اندازه فایل:</dt>
                                            <dd>{formatBytes(file.size)}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt>تعداد ردیف‌های خوانده شده:</dt>
                                            <dd>{rawData.length.toLocaleString("fa-IR")}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt>جداکننده تشخیص داده‌شده:</dt>
                                            <dd>{delimiter === "\t" ? "Tab" : delimiter}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt>ستون‌های فعال برای درون‌ریزی:</dt>
                                            <dd>{selectedColumnCount}</dd>
                                        </div>
                                    </dl>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card
                        className="h-fit border-border/70 shadow-lg shadow-primary/5 supports-[backdrop-filter]:backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">تنظیمات جدول مقصد</CardTitle>
                            <CardDescription>
                                نام جدول به صورت پیش‌فرض از نام فایل انتخاب می‌شود. در صورت نیاز آن را ویرایش کنید.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="table-name">نام جدول در PostgreSQL</Label>
                                <Input
                                    id="table-name"
                                    placeholder="مثلاً orders"
                                    value={tableName}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                        setTableName(event.target.value.trim().toLowerCase())
                                    }}
                                    aria-invalid={Boolean(tableNameError)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    فقط حروف کوچک انگلیسی، خط زیر و اعداد مجاز هستند (حداکثر ۶۳ کاراکتر).
                                </p>
                                {tableNameError && <p className="text-xs text-destructive">{tableNameError}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="table-comment">توضیحات جدول</Label>
                                <Textarea
                                    id="table-comment"
                                    placeholder="توضیح اختیاری برای جدول مقصد..."
                                    value={tableComment}
                                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setTableComment(event.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium">ردیف اول شامل عنوان ستون‌ها است</p>
                                    <p className="text-xs text-muted-foreground">
                                        اگر این گزینه را غیرفعال کنید، ستون‌ها با نام‌های پیش‌فرض ساخته می‌شوند.
                                    </p>
                                </div>
                                <Switch dir='ltr'
                                        checked={useFirstRowAsHeader}
                                        onCheckedChange={(checked: boolean) => setUseFirstRowAsHeader(checked)}
                                        aria-label="ردیف اول شامل نام ستون‌ها باشد"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card
                    className="border-border/70 shadow-xl shadow-primary/5 supports-[backdrop-filter]:backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">پیکربندی ستون‌ها</CardTitle>
                        <CardDescription>
                            برای هر ستون می‌توانید نام فیلد در جدول، نوع داده، توضیحات و وضعیت درون‌ریزی را مشخص کنید.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!rawData.length ? (
                            <div
                                className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                                هنوز فایلی انتخاب نشده است.
                            </div>
                        ) : (
                            <ScrollArea className="h-[520px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[60px]">ستون</TableHead>
                                            <TableHead className="w-[120px]">درون‌ریزی</TableHead>
                                            <TableHead>نام ستون در جدول</TableHead>
                                            <TableHead className="w-[160px]">نوع داده</TableHead>
                                            <TableHead className="w-[220px]">توضیح ستون</TableHead>
                                            <TableHead>نمونه داده</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {columns.map((column, index) => {
                                            const columnNameError = getIdentifierError(column.tableColumnName)
                                            const disabled = !column.include
                                            return (
                                                <TableRow key={column.id}
                                                          className={disabled ? "opacity-50" : undefined}>
                                                    <TableCell className="text-sm font-medium">
                                                        {column.headerLabel || `ستون ${index + 1}`}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={column.include}
                                                                onCheckedChange={(checked: CheckedState) =>
                                                                    setColumns((current) =>
                                                                        current.map((item) =>
                                                                            item.id === column.id
                                                                                ? {...item, include: Boolean(checked)}
                                                                                : item
                                                                        )
                                                                    )
                                                                }
                                                                aria-label={`فعال‌سازی ستون ${column.headerLabel || index + 1}`}
                                                            />
                                                            <span
                                                                className="text-xs text-muted-foreground">درون‌ریزی</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <Input
                                                                value={column.tableColumnName}
                                                                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                                                    const value = event.target.value.trim().toLowerCase()
                                                                    setColumns((current) =>
                                                                        current.map((item) =>
                                                                            item.id === column.id
                                                                                ? {
                                                                                    ...item,
                                                                                    tableColumnName: value,
                                                                                    isNameDirty: value !== item.autoColumnName,
                                                                                }
                                                                                : item
                                                                        )
                                                                    )
                                                                }}
                                                                disabled={disabled}
                                                                aria-invalid={Boolean(columnNameError)}
                                                            />
                                                            {columnNameError ? (
                                                                <p className="text-xs text-destructive">{columnNameError}</p>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground">
                                                                    پیشنهاد: <span
                                                                    className="font-medium">{column.autoColumnName}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={column.dataType}
                                                            onValueChange={(value: PostgresDataType) =>
                                                                setColumns((current) =>
                                                                    current.map((item) =>
                                                                        item.id === column.id
                                                                            ? {
                                                                                ...item,
                                                                                dataType: value,
                                                                                isTypeDirty: value !== item.autoType,
                                                                            }
                                                                            : item
                                                                    )
                                                                )
                                                            }
                                                            disabled={disabled}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="انتخاب نوع"/>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {POSTGRES_DATA_TYPES.map((option: PostgresDataType) => (
                                                                    <SelectItem key={option} value={option}>
                                                                        {option}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {!disabled && column.autoType !== column.dataType && (
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                نوع پیشنهادی: {column.autoType}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Textarea
                                                            value={column.comment}
                                                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                                                setColumns((current) =>
                                                                    current.map((item) =>
                                                                        item.id === column.id
                                                                            ? {...item, comment: event.target.value}
                                                                            : item
                                                                    )
                                                                )
                                                            }
                                                            rows={2}
                                                            disabled={disabled}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs text-muted-foreground">
                                                            {renderSamples(column.sampleValues)}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </section>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="w-fit max-w-[95vw] sm:max-w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>پیش‌نمایش داده‌های CSV</DialogTitle>
                    </DialogHeader>
                    {!rawData.length ? (
                        <p className="text-sm text-muted-foreground">هنوز داده‌ای برای نمایش وجود ندارد.</p>
                    ) : (
                        <div className="space-y-3 inline-block">
                            <p className="text-sm text-muted-foreground">
                                فقط {Math.min(previewRows.length, MAX_PREVIEW_ROWS)} ردیف اول نمایش داده می‌شود.
                            </p>
                            <div className="inline-block max-h-[70vh] max-w-[90vw] overflow-auto rounded-lg border">
                                <table className="min-w-max text-sm">
                                    <thead>
                                    <tr className="border-b bg-muted/60">
                                        {preparedHeader.map((header, index) => (
                                            <th key={`head-${index}`}
                                                className="px-3 py-2 text-right font-medium whitespace-nowrap">
                                                {header || `ستون ${index + 1}`}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {previewRows.map((row, rowIndex) => (
                                        <tr key={`row-${rowIndex}`} className="border-b last:border-b-0">
                                            {preparedHeader.map((_, colIndex) => (
                                                <td key={`cell-${rowIndex}-${colIndex}`}
                                                    className="px-3 py-2 text-right whitespace-nowrap">
                                                    {row[colIndex] ?? ""}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </main>
    )
}

function formatBytes(bytes: number): string {
    const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"]
    if (bytes === 0) return "0"
    const index = Math.floor(Math.log(bytes) / Math.log(1024))
    const value = bytes / Math.pow(1024, index)
    return `${value.toFixed(1)} ${units[index] ?? "بایت"}`
}

function renderSamples(samples: string[]): string {
    const visibleSamples = samples.filter((sample) => sample.trim().length > 0).slice(0, 3)
    if (!visibleSamples.length) {
        return "نمونه‌ای موجود نیست"
    }
    return visibleSamples.join(" | ")
}

function buildColumns(
    rows: string[][],
    useHeader: boolean,
    previousColumns: ColumnConfig[]
): ColumnConfig[] {
    const headerRow = useHeader ? rows[0] ?? [] : []
    const dataRows = useHeader ? rows.slice(1) : rows
    const columnCount = Math.max(
        headerRow.length,
        ...dataRows.map((row) => row.length)
    )

    return Array.from({length: columnCount}, (_, index) => {
        const sourceName = (headerRow[index] ?? "").trim()
        const headerLabel = sourceName || `ستون ${index + 1}`
        const autoColumnName = sanitizeIdentifier(sourceName || `column_${index + 1}`, `column_${index + 1}`)
        const sampleValues = dataRows.slice(0, 12).map((row) => (row[index] ?? "").trim())
        const inferredType = inferPostgresType(sampleValues)

        const previous = previousColumns.find((column) => column.id === `column-${index}`)

        const include = previous?.include ?? true
        const isNameDirty = previous?.isNameDirty ?? false
        const isTypeDirty = previous?.isTypeDirty ?? false

        return {
            id: `column-${index}`,
            headerLabel,
            sourceName,
            sampleValues,
            include,
            comment: previous?.comment ?? "",
            autoColumnName,
            tableColumnName: isNameDirty ? previous?.tableColumnName ?? autoColumnName : autoColumnName,
            isNameDirty,
            autoType: inferredType,
            dataType: isTypeDirty ? previous?.dataType ?? inferredType : inferredType,
            isTypeDirty,
        }
    })
}

