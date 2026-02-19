import ConverterClientWrapper from "@/widgets/pdf-converter/ui/ConverterClientWrapper";

export default function ConvertPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <ConverterClientWrapper />
    </div>
  );
}
