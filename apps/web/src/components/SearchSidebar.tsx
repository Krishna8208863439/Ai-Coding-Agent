import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Replace,
  RefreshCw,
  FileCode,
  X,
  Loader2,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { usePreferencesStore } from '../store/preferencesStore';

interface SearchMatch {
  lineNumber: number;
  lineText: string;
  matchIndex: number;
  matchLength: number;
}

interface FileSearchResult {
  file: string;
  matches: SearchMatch[];
}

interface SearchSidebarProps {
  onOpenFile: (path: string, lineNumber?: number) => void;
}

export function SearchSidebar({ onOpenFile }: SearchSidebarProps) {
  const { currentWorkspace } = useWorkspaceStore();
  const { addToast } = usePreferencesStore();

  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');

  // Options
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);

  // Results
  const [isSearching, setIsSearching] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [results, setResults] = useState<FileSearchResult[]>([]);
  const [totalMatches, setTotalMatches] = useState<number | null>(null);
  const [totalFiles, setTotalFiles] = useState<number | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [searchError, setSearchError] = useState<string | null>(null);

  const queryInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    queryInputRef.current?.focus();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || !currentWorkspace) {
      setResults([]);
      setTotalMatches(null);
      setTotalFiles(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch('/api/fs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: currentWorkspace.rootPath,
          query: query.trim(),
          isRegex,
          matchCase,
          matchWholeWord,
          include: includePattern.trim(),
          exclude: excludePattern.trim(),
          maxResults: 500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotalMatches(data.totalMatches || 0);
        setTotalFiles(data.totalFiles || 0);
        setCollapsedFiles(new Set()); // Expand all on new search
      } else {
        const err = await res.json();
        setSearchError(err.message || 'Search failed');
        setResults([]);
        setTotalMatches(0);
        setTotalFiles(0);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Network error');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReplaceAll = async () => {
    if (!currentWorkspace || !query.trim() || results.length === 0) return;

    if (!confirm(`Replace all occurrences of "${query}" with "${replaceText}" across ${totalFiles} file(s)?`)) {
      return;
    }

    setIsReplacing(true);
    try {
      const filesToReplace = results.map((r) => r.file);
      const res = await fetch('/api/fs/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: currentWorkspace.rootPath,
          query: query.trim(),
          replacement: replaceText,
          isRegex,
          matchCase,
          matchWholeWord,
          files: filesToReplace,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addToast(
          'Replaced All',
          `Replaced ${data.totalReplacements} occurrence(s) across ${data.filesModified} file(s).`,
          'success'
        );
        // Re-run search to show updated state
        handleSearch();
      } else {
        const err = await res.json();
        addToast('Replace Failed', err.message || 'Could not replace', 'error');
      }
    } catch (err: any) {
      addToast('Replace Error', err.message, 'error');
    } finally {
      setIsReplacing(false);
    }
  };

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const collapseAllFiles = () => {
    setCollapsedFiles(new Set(results.map((r) => r.file)));
  };

  const expandAllFiles = () => {
    setCollapsedFiles(new Set());
  };

  // Helper to highlight matched part in preview string
  const renderHighlightedLine = (match: SearchMatch) => {
    const { lineText, matchIndex, matchLength } = match;
    const before = lineText.slice(0, matchIndex);
    const highlighted = lineText.slice(matchIndex, matchIndex + matchLength);
    const after = lineText.slice(matchIndex + matchLength);

    return (
      <span className="truncate">
        <span>{before}</span>
        <span className="bg-amber-500/40 text-amber-200 font-semibold px-0.5 rounded">
          {highlighted}
        </span>
        <span>{after}</span>
      </span>
    );
  };

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 text-xs select-none">
        <Search className="w-8 h-8 opacity-40 mb-2 text-cyan-400" />
        <span className="font-semibold text-neutral-300 mb-1">No Folder Open</span>
        <span className="text-[11px] text-neutral-500">Open a workspace folder to search across files.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#181818] text-xs select-none overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#2b2b2b] flex items-center justify-between text-neutral-400 font-semibold uppercase text-[10px] tracking-wider shrink-0">
        <span>Search</span>
        <div className="flex items-center gap-1">
          {results.length > 0 && (
            <>
              <button
                onClick={collapseAllFiles}
                title="Collapse All"
                className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={expandAllFiles}
                title="Expand All"
                className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => handleSearch()}
            title="Refresh Search"
            disabled={isSearching}
            className="p-1 hover:text-white hover:bg-[#2b2b2b] rounded transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Input Controls */}
      <div className="p-2.5 border-b border-[#2b2b2b] space-y-2 shrink-0 bg-[#141414]">
        {/* Row 1: Search Query */}
        <form onSubmit={handleSearch} className="relative flex items-center">
          <button
            type="button"
            onClick={() => setShowReplace(!showReplace)}
            title="Toggle Replace"
            className="p-1 text-neutral-400 hover:text-neutral-200 mr-1"
          >
            {showReplace ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="relative flex-1 flex items-center">
            <input
              ref={queryInputRef}
              type="text"
              placeholder="Search (Enter to submit)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#333] focus:border-cyan-500 rounded pl-2.5 pr-20 py-1 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
            />

            {/* Modifiers (Case, Whole Word, Regex) */}
            <div className="absolute right-1 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setMatchCase(!matchCase)}
                title="Match Case (Alt+C)"
                className={`px-1 py-0.5 text-[10px] rounded font-mono font-bold transition-colors ${
                  matchCase
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/60'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Aa
              </button>
              <button
                type="button"
                onClick={() => setMatchWholeWord(!matchWholeWord)}
                title="Match Whole Word (Alt+W)"
                className={`px-1 py-0.5 text-[10px] rounded font-mono font-bold transition-colors ${
                  matchWholeWord
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/60'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                \b
              </button>
              <button
                type="button"
                onClick={() => setIsRegex(!isRegex)}
                title="Use Regular Expression (Alt+R)"
                className={`px-1 py-0.5 text-[10px] rounded font-mono font-bold transition-colors ${
                  isRegex
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/60'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                .*
              </button>
            </div>
          </div>
        </form>

        {/* Row 2: Replace Input (Optional) */}
        {showReplace && (
          <div className="flex items-center gap-1.5 pl-6">
            <input
              type="text"
              placeholder="Replace"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="flex-1 bg-[#1e1e1e] border border-[#333] focus:border-cyan-500 rounded px-2.5 py-1 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={handleReplaceAll}
              disabled={isReplacing || results.length === 0 || !query.trim()}
              title="Replace All across workspace"
              className="p-1.5 bg-[#252526] hover:bg-[#333] text-neutral-300 hover:text-white rounded border border-[#3c3c3c] transition-colors disabled:opacity-40 shrink-0"
            >
              {isReplacing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Replace className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>
          </div>
        )}

        {/* Filter Toggle and Fields */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
          >
            {showFilters ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>files to include / exclude</span>
          </button>

          {showFilters && (
            <div className="mt-2 space-y-1.5 pl-2 border-l border-[#2e2e2e]">
              <div>
                <span className="text-[10px] text-neutral-500 block mb-0.5">files to include (e.g. *.ts, src/):</span>
                <input
                  type="text"
                  placeholder="*.ts, *.tsx"
                  value={includePattern}
                  onChange={(e) => setIncludePattern(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#333] rounded px-2 py-0.5 text-[11px] text-neutral-200 focus:outline-none font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block mb-0.5">files to exclude:</span>
                <input
                  type="text"
                  placeholder="node_modules, dist, *.min.js"
                  value={excludePattern}
                  onChange={(e) => setExcludePattern(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#333] rounded px-2 py-0.5 text-[11px] text-neutral-200 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Header / Error */}
      {searchError && (
        <div className="p-2.5 bg-red-950/40 border-b border-red-800 text-red-300 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="truncate">{searchError}</span>
        </div>
      )}

      {totalMatches !== null && (
        <div className="px-3 py-1.5 bg-[#141414] border-b border-[#2b2b2b] text-[10px] text-neutral-400 font-mono flex items-center justify-between">
          <span>
            {totalMatches === 0
              ? 'No results found'
              : `${totalMatches} match${totalMatches === 1 ? '' : 'es'} in ${totalFiles} file${totalFiles === 1 ? '' : 's'}`}
          </span>
          {totalMatches >= 500 && (
            <span className="text-amber-400 font-semibold">(500+ limit reached)</span>
          )}
        </div>
      )}

      {/* Results Tree */}
      <div className="flex-1 overflow-y-auto p-1 space-y-1">
        {isSearching && (
          <div className="flex items-center justify-center py-8 text-neutral-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="text-xs">Searching workspace...</span>
          </div>
        )}

        {!isSearching && totalMatches === 0 && (
          <div className="py-8 text-center text-neutral-500 text-xs">
            No results found for <span className="text-neutral-300 font-mono">"{query}"</span>
          </div>
        )}

        {!isSearching &&
          results.map((fileRes) => {
            const isCollapsed = collapsedFiles.has(fileRes.file);
            const fileName = fileRes.file.split('/').pop() || fileRes.file;
            const dirPath = fileRes.file.includes('/')
              ? fileRes.file.substring(0, fileRes.file.lastIndexOf('/'))
              : '';

            return (
              <div key={fileRes.file} className="rounded overflow-hidden">
                {/* File Header */}
                <div
                  onClick={() => toggleFileCollapse(fileRes.file)}
                  className="flex items-center justify-between px-2 py-1 bg-[#202020] hover:bg-[#262626] cursor-pointer text-neutral-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    )}
                    <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-[11px] truncate">{fileName}</span>
                    {dirPath && (
                      <span className="text-[10px] text-neutral-500 truncate">{dirPath}</span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1 rounded shrink-0">
                    {fileRes.matches.length}
                  </span>
                </div>

                {/* File Matches List */}
                {!isCollapsed && (
                  <div className="pl-4 py-0.5 space-y-0.5 border-l border-[#2e2e2e] ml-2">
                    {fileRes.matches.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => onOpenFile(fileRes.file, m.lineNumber)}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-[#252526] cursor-pointer rounded text-neutral-300 hover:text-white transition-colors group font-mono text-[11px]"
                      >
                        <span className="text-cyan-500/80 font-bold shrink-0 min-w-5 text-right">
                          {m.lineNumber}
                        </span>
                        <div className="truncate flex-1">
                          {renderHighlightedLine(m)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
