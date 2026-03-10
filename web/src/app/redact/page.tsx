import PdfRedactWidget from '@/widgets/pdf-redact/ui/PdfRedactWidget';

export default function RedactPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <PdfRedactWidget />
    </div>
  );
}
