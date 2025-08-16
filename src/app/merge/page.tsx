import { PdfMergeWidget } from "@/widgets/pdf-merger/ui/PdfMergeWidget";


export default function Home() {
  return (
    <div className="flex min-h-screen w-full fels-col items-center justify-center bg-gray-100 p-4 dark:bg-gray=900 ">
      <PdfMergeWidget></PdfMergeWidget>
    </div>
  );
}
