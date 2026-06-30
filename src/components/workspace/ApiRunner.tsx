import { Send, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/agent/workspaceStore";
import type { HttpMethod } from "@/lib/agent/types";
import { ResponseViewer } from "./ResponseViewer";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function ApiRunner() {
  const { request, setRequest, send, sending, response, saveCurrent } = useWorkspace();
  const [collectionName] = useState("Demo Suite");

  const headersText = Object.entries(request.headers ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const setHeadersText = (text: string) => {
    const headers: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    setRequest({ ...request, headers });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-card/30 px-4 py-3">
        <Select
          value={request.method}
          onValueChange={(m) => setRequest({ ...request, method: m as HttpMethod })}
        >
          <SelectTrigger className="w-28 font-mono font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m} className="font-mono">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={request.url}
          onChange={(e) => setRequest({ ...request, url: e.target.value })}
          placeholder="/users"
          className="flex-1 font-mono text-sm"
        />
        <Button onClick={send} disabled={sending} className="gap-1.5">
          <Send className="h-3.5 w-3.5" />
          {sending ? "Sending..." : "Send"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Save to collection"
          onClick={() => saveCurrent(collectionName)}
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-2 overflow-hidden">
        <div className="flex flex-col border-r border-border">
          <Tabs defaultValue="body" className="flex h-full flex-col">
            <TabsList className="mx-3 mt-3 self-start">
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
            </TabsList>
            <TabsContent value="body" className="flex-1 px-3 pb-3">
              <Textarea
                value={request.body ?? ""}
                onChange={(e) => setRequest({ ...request, body: e.target.value })}
                placeholder='{"key":"value"}'
                className="h-full resize-none font-mono text-xs"
              />
            </TabsContent>
            <TabsContent value="headers" className="flex-1 px-3 pb-3">
              <Textarea
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                placeholder="Content-Type: application/json"
                className="h-full resize-none font-mono text-xs"
              />
            </TabsContent>
          </Tabs>
        </div>

        <ResponseViewer response={response} loading={sending} />
      </div>
    </div>
  );
}