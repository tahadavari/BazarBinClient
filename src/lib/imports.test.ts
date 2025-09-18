import {describe, expect, it} from "vitest"

import {buildImportFormData, createImportSchema, type ImportColumnInput} from "./imports"

const baseColumns: ImportColumnInput[] = [
    {
        include: true,
        tableColumnName: "product_id",
        dataType: "integer",
        comment: " شناسه محصول ",
    },
    {
        include: false,
        tableColumnName: "ignored_column",
        dataType: "text",
        comment: "",
    },
    {
        include: true,
        tableColumnName: "price",
        dataType: "numeric",
        comment: "",
    },
]

describe("createImportSchema", () => {
    it("creates schema with active columns and trimmed fields", () => {
        const schema = createImportSchema({
            tableName: " sample_products ",
            tableComment: "  sample table  ",
            useFirstRowAsHeader: true,
            columns: baseColumns,
        })

        expect(schema).toEqual({
            TableName: "sample_products",
            TableComment: "sample table",
            FirstRowIsHeader: 1,
            Columns: [
                {
                    Name: "product_id",
                    DbType: "integer",
                    Comment: "شناسه محصول",
                },
                {
                    Name: "price",
                    DbType: "numeric",
                },
            ],
        })
    })

    it("omits optional comment when empty", () => {
        const schema = createImportSchema({
            tableName: "products",
            tableComment: "",
            useFirstRowAsHeader: false,
            columns: [
                {
                    include: true,
                    tableColumnName: "name",
                    dataType: "text",
                    comment: "  ",
                },
            ],
        })

        expect(schema).toEqual({
            TableName: "products",
            FirstRowIsHeader: 0,
            Columns: [
                {
                    Name: "name",
                    DbType: "text",
                },
            ],
        })
    })

    it("throws when table name is empty", () => {
        expect(() =>
            createImportSchema({
                tableName: "   ",
                tableComment: "",
                useFirstRowAsHeader: true,
                columns: baseColumns,
            })
        ).toThrow(/tableName is required/)
    })

    it("throws when no active columns exist", () => {
        expect(() =>
            createImportSchema({
                tableName: "products",
                tableComment: "",
                useFirstRowAsHeader: true,
                columns: baseColumns.map((column) => ({...column, include: false})),
            })
        ).toThrow(/At least one column must be included/)
    })
})

describe("buildImportFormData", () => {
    it("creates multipart payload with schema and file", async () => {
        const schema = createImportSchema({
            tableName: "products",
            tableComment: "",
            useFirstRowAsHeader: true,
            columns: baseColumns,
        })

        const file = new File(["id,name"], "sample.csv", {type: "text/csv"})
        const formData = buildImportFormData(schema, file)

        const schemaEntry = formData.get("schema")
        expect(schemaEntry).toBeInstanceOf(File)
        const schemaValue = schemaEntry as File
        const schemaText = await readFileAsText(schemaValue)
        expect(JSON.parse(schemaText)).toEqual(schema)

        const fileEntry = formData.get("file")
        expect(fileEntry).toBeInstanceOf(File)
        expect((fileEntry as File).name).toBe("sample.csv")
    })
})

async function readFileAsText(file: File): Promise<string> {
    if (typeof file.text === "function") {
        return file.text()
    }

    if (typeof FileReader !== "undefined") {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"))
            reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
            reader.readAsText(file)
        })
    }

    if (typeof file.arrayBuffer === "function") {
        const buffer = await file.arrayBuffer()
        return Buffer.from(buffer).toString("utf-8")
    }

    throw new Error("Unsupported file implementation")
}
