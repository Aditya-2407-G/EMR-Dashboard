import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEmrDataContext } from "@/context/EmrDataContext";

/**
 * FileUpload component for processing JSON files locally
 * No backend required - processes files in the browser using FileReader
 */

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { processJsonFile } = useEmrDataContext();

  /**
   * Opens file selection dialog
   */
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handles file upload and processing locally
   * @param event - File input change event
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JSON file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Process the file locally using the context
      await processJsonFile(file);

      toast({
        title: "Upload successful",
        description: `Successfully processed data from ${file.name}`,
      });

      onUploadSuccess();
      
      // Clear the input for next upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = "Failed to process file. Please check the file format.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-file-upload"
      />
      <Button
        onClick={handleFileSelect}
        disabled={isUploading}
        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        data-testid="button-upload"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Upload className="w-5 h-5 mr-2" />
        )}
        {isUploading ? "Uploading..." : "Upload JSON Data"}
      </Button>
    </>
  );
}
