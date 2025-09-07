
export async function downloadBlob(mergedPdfBlob: Blob, fileName: string) {

const url = window.URL.createObjectURL(mergedPdfBlob);



const a = document.createElement('a');
a.href = url;
a.download = fileName;

document.body.appendChild(a);
a.click();
a.remove();
window.URL.revokeObjectURL(url);

}
