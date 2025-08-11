export interface SelectedFile {
    name: string;
    size?: number;
    type?: string;
    file: File;
    lastModified?: number;
}