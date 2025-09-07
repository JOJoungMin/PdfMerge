import MergeClientWrapper from "@/widgets/pdf-merger/ui/MergeClientWidget";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <MergeClientWrapper />
    </div>
  );
}