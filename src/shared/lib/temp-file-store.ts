class TempFileStore {
  private file: File | null = null;

  setFile(file: File | null) {
    this.file = file;
  }

  getFile(): File | null {
    const tempFile = this.file;
    this.file = null; // The file can only be retrieved once
    return tempFile;
  }
}

export const tempFileStore = new TempFileStore();
