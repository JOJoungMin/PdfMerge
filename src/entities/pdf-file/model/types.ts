export interface PdfFileItemprops{
    file: File;
    index: number;
    handleRemoveFile: (index: number) => void;
}

export interface PdfPage {
    id: string;
    pageNumber: number;
    canvas?: HTMLCanvasElement;
    imageUrl?: string;
    width: number;
    height: number;
  }