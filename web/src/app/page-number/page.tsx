import PageNumberWidget from '@/widgets/pdf-page-number/ui/PageNumberWidget';

export default function PageNumberPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <PageNumberWidget />
    </div>
  );
}
