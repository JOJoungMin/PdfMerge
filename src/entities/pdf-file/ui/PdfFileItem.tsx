import { FileIcon, X } from 'lucide-react';
import type { PdfFileItemprops } from '../model/types';



export default function PdfFileItem({file, index, handleRemoveFile}: PdfFileItemprops){
    return(
        <div key={index} className="flex items-center justify-between rounded-md bg-gray-100 p-3 dark:bg-gray-700">
        <div className="flex min-w-0 items-center">
          <FileIcon className="mr-2 h-5 w-5 flex-shrink-0 text-blue-500" />
          <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</span>
        </div>
        <button onClick={() => handleRemoveFile(index)} className="ml-2 flex-shrink-0 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">
          <X className="h-5 w-5" />
        </button>
      </div>
    )
}