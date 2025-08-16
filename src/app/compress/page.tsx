import CompressorClientWrapper from "@/widgets/pdf-compressor/ui/CompressorClientWrapper";

export default function CompressPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <CompressorClientWrapper />
    </div>
  );
}
