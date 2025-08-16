export interface PdfFileItemprops{
    file: File;
    index: number;
    handleRemoveFile: (index: number) => void;
}