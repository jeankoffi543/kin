declare module 'json-form-data' {
  interface Options {
    initialFormData?: FormData
    showLeafArrayIndexes?: boolean
    includeNullValues?: boolean
    mapping?: (value: unknown) => unknown
  }

  function jsonToFormData(data: unknown, options?: Options): FormData

  export default jsonToFormData
  export = jsonToFormData
}
