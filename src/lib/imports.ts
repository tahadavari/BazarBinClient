import type {PostgresDataType} from "./postgres"

export type ImportColumnInput = {
    include: boolean
    tableColumnName: string
    dataType: PostgresDataType
    comment: string
}

export type ImportColumnSchema = {
    Name: string
    DbType: PostgresDataType
    Comment?: string
}

export type ImportSchema = {
    TableName: string
    TableComment?: string
    FirstRowIsHeader: boolean
    Columns: ImportColumnSchema[]
}

export function createImportSchema(options: {
    tableName: string
    tableComment: string
    useFirstRowAsHeader: boolean
    columns: ImportColumnInput[]
}): ImportSchema {
    const trimmedTableName = options.tableName.trim()
    if (!trimmedTableName) {
        throw new Error("tableName is required")
    }

    const activeColumns = options.columns.filter((column) => column.include)
    if (!activeColumns.length) {
        throw new Error("At least one column must be included")
    }

    const columns = activeColumns.map<ImportColumnSchema>((column) => {
        const trimmedComment = column.comment.trim()
        const schemaColumn: ImportColumnSchema = {
            Name: column.tableColumnName,
            DbType: column.dataType,
        }
        if (trimmedComment) {
            schemaColumn.Comment = trimmedComment
        }
        return schemaColumn
    })

    const schema: ImportSchema = {
        TableName: trimmedTableName,
        FirstRowIsHeader: options.useFirstRowAsHeader,
        Columns: columns,
    }

    const trimmedComment = options.tableComment.trim()
    if (trimmedComment) {
        schema.TableComment = trimmedComment
    }

    return schema
}

export function buildImportFormData(schema: ImportSchema, file: File): FormData {
    const formData = new FormData()
    formData.append("schema", JSON.stringify(schema))
    formData.append("file", file, file.name)
    return formData
}
