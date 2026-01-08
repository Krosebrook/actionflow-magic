import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, RefreshCw, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  event_type: string;
  event_category: string;
  user_id: string | null;
  workspace_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  severity: string;
  created_at: string;
}

interface AuditLogViewerProps {
  workspaceId: string | null;
}

export const AuditLogViewer = ({ workspaceId }: AuditLogViewerProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchLogs = async () => {
    setLoading(true);
    
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [workspaceId]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    const matchesCategory = categoryFilter === "all" || log.event_category === categoryFilter;

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const categories = [...new Set(logs.map((log) => log.event_category))];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <AlertTriangle className="h-3 w-3" />
            Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            Info
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              Monitor security events and user activity across your workspace
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <ScrollArea className="h-[500px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                    <TableCell className="font-medium">{log.event_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.event_category}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ip_address || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {log.details ? JSON.stringify(log.details) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="text-xs text-muted-foreground">
          Showing {filteredLogs.length} of {logs.length} events
        </div>
      </CardContent>
    </Card>
  );
};
