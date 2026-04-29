import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mt-64 w-full flex items-center justify-center">
      <Card className="w-full max-w-md p-8 border border-primary/10">
        <CardContent>
          <div className="flex gap-4 pt-4 items-center justify-center">
            <AlertCircle className="h-8 w-8 text-purple-500" />
            <h1 className="text-2xl text-white">404 Page Not Found</h1>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
