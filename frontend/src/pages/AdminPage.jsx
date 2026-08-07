import React from "react";
import { toast } from "sonner";
import { Trash2, Plus, Upload, Loader2, Music2 } from "lucide-react";
import { adminListSongs, adminCreateSong, adminDeleteSong, adminImportCsv } from "@/lib/api";

const EMPTY = {
  title: "", artist: "", album_or_film: "", year: "", decade: "",
  language: "", difficulty: "", preview_url: "", artwork_url: "",
};

export default function AdminPage() {
  const [songs, setSongs] = React.useState(null);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const fileRef = React.useRef(null);

  const load = React.useCallback(() => {
    adminListSongs().then(setSongs).catch(() => setSongs([]));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const add = async () => {
    if (!form.title || !form.preview_url) {
      toast.error("Title and preview URL are required");
      return;
    }
    setSaving(true);
    try {
      await adminCreateSong(form);
      toast.success("Track filed to the archive");
      setForm(EMPTY);
      load();
    } catch (e) {
      toast.error("Could not save the track");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await adminDeleteSong(id);
    load();
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminImportCsv(fd);
      toast.success(`Imported ${res.inserted} new, updated ${res.updated}`);
      load();
    } catch (err) {
      toast.error("CSV import failed — check the columns");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const fields = [
    ["title", "Title *"], ["artist", "Artist"], ["album_or_film", "Album / Film"],
    ["year", "Year"], ["decade", "Decade"], ["language", "Language"],
    ["difficulty", "Difficulty"], ["preview_url", "Preview URL *"], ["artwork_url", "Artwork URL"],
  ];

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="data-label text-[11px] text-sd-muted">Evidence Room</div>
      <h1 className="font-display font-bold uppercase text-3xl tracking-tight mt-1 text-sd-text">Admin</h1>

      {/* CSV import */}
      <div className="bg-sd-surface border border-sd-hairline rounded-lg p-4 mt-5">
        <div className="data-label text-[10px] text-sd-muted mb-2">Bulk Import (CSV)</div>
        <p className="text-xs text-sd-muted mb-3">
          Columns: title, artist, album_or_film, year, decade, language, difficulty, preview_url, artwork_url
        </p>
        <input ref={fileRef} type="file" accept=".csv" onChange={onImport} className="hidden" data-testid="csv-input" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          data-testid="import-csv-button"
          className="w-full py-3 rounded-md border border-sd-hairline text-sd-text flex items-center justify-center gap-2 hover:bg-sd-elevated transition-colors"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload CSV
        </button>
      </div>

      {/* Add form */}
      <div className="bg-sd-surface border border-sd-hairline rounded-lg p-4 mt-4">
        <div className="data-label text-[10px] text-sd-muted mb-3">Add a Track</div>
        <div className="grid grid-cols-2 gap-2.5">
          {fields.map(([k, label]) => (
            <div key={k} className={k === "preview_url" || k === "artwork_url" || k === "title" ? "col-span-2" : ""}>
              <input
                value={form[k]}
                onChange={set(k)}
                placeholder={label}
                data-testid={`song-field-${k}`}
                className="w-full bg-sd-base border border-sd-hairline rounded-md px-3 py-2 text-sm text-sd-text placeholder:text-sd-muted focus:outline-none focus:border-sd-text"
              />
            </div>
          ))}
        </div>
        <button
          onClick={add}
          disabled={saving}
          data-testid="add-song-button"
          className="mt-3 w-full py-3 rounded-md font-display font-bold uppercase tracking-wide bg-sd-gold text-[#1A1108] flex items-center justify-center gap-2 hover:brightness-105 transition-all disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} File Track
        </button>
      </div>

      {/* List */}
      <div className="mt-6">
        <div className="data-label text-[10px] text-sd-muted mb-3">
          Archive {songs ? `· ${songs.length} tracks` : ""}
        </div>
        {!songs ? (
          <div className="flex justify-center py-10 text-sd-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : songs.length === 0 ? (
          <div className="text-center py-10 text-sd-muted text-sm">
            <Music2 className="w-6 h-6 mx-auto mb-2 opacity-60" />
            No tracks yet. Import a CSV or add one above.
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-sd-surface border border-sd-hairline">
                {s.artwork_url ? (
                  <img src={s.artwork_url} alt="" className="w-10 h-10 rounded object-cover border border-sd-hairline" />
                ) : (
                  <div className="w-10 h-10 rounded bg-sd-elevated" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sd-text text-sm font-medium truncate">{s.title}</div>
                  <div className="text-xs text-sd-muted truncate">
                    {[s.artist, s.year, s.language].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button
                  onClick={() => remove(s.id)}
                  data-testid="delete-song-button"
                  className="shrink-0 p-2 text-sd-muted hover:text-sd-copper transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
