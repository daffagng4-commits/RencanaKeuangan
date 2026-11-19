# Paritas Mode Perjalanan: Desktop Aktif (`browser-app.js`) vs APK (`mobile-app.js`)

Dokumen ini menjadi acuan **Tahap 1–4** penyamaan fitur Mode Perjalanan antara UI **desktop aktif** (`renderTrip` di `js/ui/browser-app.js` + handler `br-trip-*`, `trip-*-form`, `data-trip-*`, `data-dt-day`) dan Mode APK (`#mobile-app-shell` di `js/ui-mobile/mobile-app.js`).

> **Koreksi Acuan Desktop (hasil verifikasi kode pada awal Tahap 2):**
> Pada bundel aplikasi, `js/ui/browser-app.js` dimuat setelah `js/ui/trip.js` (`index.dev.html:1294,1301`) dan menimpa `renderTrip()`, `bindTrip()`, `modeUi()`, serta `setMode()`. Karena itu:
> - **Acuan tampilan & field UI desktop** adalah **`js/ui/browser-app.js`** (baris 2707–2890, 3114–3130, 3256–3279, 3789–3800, 3884–3952, 4092–4166) dan `index.dev.html` (`#tab-trip`, `#modal-trip-form`, `#modal-trip-share`).
> - `js/ui/trip.js` dipakai sebagai **acuan & sumber logika murni bersama** (`tripPlan`, `tripDays`, `dayLabel`, `val`, `tmParse`, `goalCompute`, `monthList`, `tripText`, `tripPrintHtml`, `xlParse`, `xlTemplate`), BUKAN acuan tampilan.
> - Butir yang **hanya ada di `trip.js` dan ditimpa/tidak dirender oleh `browser-app.js`** ditandai eksplisit sebagai **kode mati di desktop aktif (tidak diparitaskan)**.

---

## Peta Tahapan Pekerjaan

| Tahap | Ruang Lingkup | Status |
| --- | --- | --- |
| **Tahap 1** | Tutup 4 bug integritas data di APK (`goal.per` hilang & `goalPlan` undefined, edit `itin`/`book` menimpa field desktop, `normKas`, konfirmasi + `snap` + Undo saat hapus) + dokumen paritas | **Selesai** |
| **Tahap 2** | **Daftar, Header, Sheet Profil, & Itinerary APK = Desktop Aktif**: kartu daftar (`N hari`, bar anggaran `.rank-track/.rank-fill` merah saat overbudget, teks `Rencana biaya ...`, badge mata uang bawaan `IDR`, `.pv`), kurs di header detail, `#m-sheet-trip` sembunyikan anggaran saat `Belum ditentukan` + `goal: null` eksplisit + validasi nama wajib = desktop aktif, form & daftar Itinerary identik desktop aktif (9 field form, default `pay: 'cash'`, `okUrl`, grup per hari `tripDays`, label hari `dayLabel`, urut jam, badge `Estimasi: Rp ...` pakai `tripItRp`, input judul hari `data-mdt-day`, tampilan item tanpa link eksternal, empty state, ikon kategori `.cat-logo`) | **Selesai (Tahap 2–3)** |
| **Tahap 3 (saat ini)** | **Pemesanan, Ringkasan, Checklist, Catatan/Tautan, Tabungan APK = Desktop Aktif**: Pemesanan (3 kartu ringkasan Total/Sudah/Belum dibayar, form dgn mata uang FX + tanggal check-in/out `a`/`b`, daftar `.cat-logo` + `a–b`, merge saat edit); Ringkasan lengkap (4 kartu KPI termasuk `Sisa/Melebihi Anggaran`, `Belum dibayar` & `Rencana per Hari`, `Siapkan Tunai/Kartu`, `Estimasi per Hari`, `Rencana Biaya per Kategori` dgn `.cat-logo`); Checklist (`N dari M siap (%)` + progress bar `.rank-track/.rank-fill`, jaga posisi scroll); Catatan + `Tautan Berguna` (`tr.lk` tambah otomatis `https://`, escape XSS, blokir `javascript:`, buka tautan aman via Capacitor Browser, hapus + Undo); Tabungan (`s0`, `link` select, `Batal`, progress % & `Ubah Target / Hapus Target` setara `browser-app.js`) | **Selesai (Tahap 3/4)** |
| **Tahap 4** | **Bagikan + Impor/Template Excel**: sheet Bagikan (`Sertakan rincian biaya`, WhatsApp / Web Share, Salin teks, Cetak/PDF kompatibel Android WebView) + Impor `.xlsx` & Template Excel (`xlTemplate`) | Belum |

---

## Model Data Bersama (`ALL.kas.pr[id]`, `link: false`)

Terverifikasi di `js/core/state.js` (`normKas`, baris 159–263):
- Profil: `{ id, name (<=30), saldo, link:false, start (ISO), end (ISO), budget, cur (3 huruf), rate, dt:{[iso]:string<=60}, tx:[], it:[], bk:[], lk:[], ck:[], note (<=2000), goal, auto:true, nm:[] }`
- Item Itinerary (`it[]`): `{ id, day (ISO), time (HH:MM), time2 (HH:MM), place (<=120), cat (<=20), est (>=0), fx (bool), pay (''|'ic'|'on'|'cash'), link (url<=400), note (<=200), done (bool), rec }`
- Pemesanan (`bk[]`): `{ id, title (<=120), cat (<=20), amt (>=0), fx (bool), pay (''|'ic'|'on'|'cash'), link (url<=400), a (ISO), b (ISO), paid (bool), rec }`
- Tautan (`lk[]`): `{ id, title (<=80), url (url<=400) }`
- Checklist (`ck[]`): `{ id, text (<=60), done (bool) }`
- Target Tabungan (`goal`): `{ t, s0, from (YYYY-MM), to (YYYY-MM), per (>0 wajib agar tidak dibuang normKas), link (bool) }` atau `null`.

---

## Inventaris Lengkap Fitur & Status Paritas APK

**Legenda Status APK**:
- **Ada (Tahap N)**: sudah tersedia dan setara dengan desktop aktif (`browser-app.js`).
- **Sebagian**: ada versi ringkas, akan disamakan pada Tahap 3/4.
- **Tidak ada**: belum tersedia di APK, dijadwalkan Tahap 3/4.
- **Kode mati di desktop aktif (tidak diparitaskan)**: hanya ada di `trip.js`, tertimpa/tidak dirender oleh `browser-app.js`.

### A. Daftar Perjalanan & Auto-Buka
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Daftar semua profil perjalanan (`!P.link`) + badge mata uang (`IDR`) | `browser-app.js:2716-2735` | **Ada** | `renderMobTrip()` memakai `.mob-sched-card` | Tahap 2 ✓ |
| Rentang tanggal `fmtD(start) – fmtD(end) · N hari`, bar anggaran `.rank-track/.rank-fill` (merah bila `pl.t > budget`), teks `"Rencana biaya ... dari anggaran ..."` / `"anggaran belum ditentukan"`, `.pv` | `browser-app.js:2725-2734` | **Ada** | Disamakan pada Tahap 2 | Tahap 2 ✓ |
| Tombol header daftar: `+ Perjalanan baru`, `Impor Excel`, `Template Excel` | `browser-app.js:2721-2723` | **Sebagian** | `+ Perjalanan baru` ada; tombol Excel dijadwalkan Tahap 4 | Tahap 4 |
| Badge *"Sedang berlangsung · Hari X/Y"* & `autoTrip` ke subtab `now` | `trip.js:139,1031` *(tidak ada di `browser-app.js:2727-2734`)* | **Kode mati di desktop aktif (tidak diparitaskan)** | `browser-app.js` tidak merender `tripBadge` maupun tab `now` (selalu mulai di `'ring'`) | — |

### B. Header Detail & Navigasi Profil
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Tombol `← Semua perjalanan` + switcher profil (`data-mtrip-sel`) | `browser-app.js:2875-2876` | **Ada** | `#m-trip-prof-strip` | — |
| Info tanggal & Kurs (`Kurs 1 CUR = Rp ...`) | `browser-app.js:2878` | **Ada** | Ditambahkan di Tahap 2 dengan `.pv` pada nominal kurs | Tahap 2 ✓ |
| Tombol `Ubah` & `Hapus` profil perjalanan (`askConfirm` + `snap` + Undo) | `browser-app.js:2881-2882,3895-3902` | **Ada** | `#m-btn-trip-edit`, `[data-mtrip-del]` | — |
| Tombol `Bagikan` di header detail | `browser-app.js:2880,3894` | **Tidak ada** | Dijadwalkan Tahap 4 | Tahap 4 |
| 6 subtab (`ring`, `itin`, `book`, `cek`, `cat`, `sv`) | `browser-app.js:2740` | **Ada** | `mobile-app.js:1741` | — |

### C. Modal / Sheet Profil Perjalanan (`Perjalanan Baru` / `Ubah`)
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Field: Nama, Mulai, Selesai, Anggaran (select toggle + nominal), Mata uang, Kurs | `index.dev.html:1143-1201`, `browser-app.js:3114-3130` | **Ada** | `#m-sheet-trip` menyembunyikan `#m-kp-budget-wrap` saat `m-kp-use-budget === '0'` & reset field saat buat baru | Tahap 2 ✓ |
| Inisialisasi profil baru menyertakan `goal: null` eksplisit | `browser-app.js:4103` | **Ada** | Ditambahkan pada Tahap 2 | Tahap 2 ✓ |
| Validasi hanya nama perjalanan wajib (`!tnm`) | `browser-app.js:4094-4095` | **Ada** | Disamakan dengan desktop aktif di Tahap 2 | Tahap 2 ✓ |
| Validasi profil ketat (`end < start`, `cur` 3 huruf, kurs `> 0`, nama duplikat) | `trip.js:583-591` *(tidak dipakai `browser-app.js:4092`)* | **Kode mati di desktop aktif (tidak diparitaskan)** | Dicatat sebagai rekomendasi perbaikan bersama di kedua mode | — |

### D. Subtab `Hari ini` (`now`) — `trip.js:989-1029`
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Subtab `Hari ini` (`tripNow`, `tripToday`, interval 60s, jadwal Besok) | Hanya di `trip.js:353,989-1029,2031` *(tidak ada di `browser-app.js:2740`)* | **Kode mati di desktop aktif (tidak diparitaskan)** | Desktop aktif tidak memiliki tab `now` | — |

### E. Subtab `Ringkasan` (`ring`)
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Kartu `Total Rencana Biaya`, `Sisa/Melebihi Anggaran` (`Belum diatur`), `Sudah Dibayar` (`Belum dibayar`), `Rencana per Hari` | `browser-app.js:2757-2761` | **Ada** | Disamakan pada Tahap 3; hint `Checklist: x/y` dihapus | Tahap 3 ✓ |
| Seksi `Siapkan Tunai / Kartu`, `Estimasi per Hari`, `Rencana Biaya per Kategori` (`.cat-logo` & bar proporsional) | `browser-app.js:2762-2774` | **Ada** | Disamakan pada Tahap 3 | Tahap 3 ✓ |

### F. Subtab `Itinerary` (`itin`)
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Form 9 input lengkap: Tanggal, Mulai (`time`), Selesai (`time2`), Kegiatan (`place`), Biaya (`est`) + Mata uang (`idr`/`fx` jika `tr.cur`), Pembayaran (`''`/`ic`/`on`/`cash`), Kategori (`ICAT`), Tautan (`link` + `okUrl`), Catatan (`note`) | `browser-app.js:2781-2789,4108-4127` | **Ada** | Disamakan pada Tahap 2; default kegiatan baru `pay: 'cash'` (`browser-app.js:2786`); validasi jam `tmParse` dipertahankan; edit hanya me-merge field form dan mempertahankan `done` & `rec` | Tahap 2 ✓ |
| Pengelompokan per hari (`tripDays(tr)` + `dayLabel`), urut jam, badge `Estimasi: Rp ...` (`tripItRp`, mengabaikan `pay: 'on'`), input judul hari `P.dt[hari]` (`data-mdt-day`, maks 60, `change` delegasi tanpa re-render) | `browser-app.js:2790-2795,4005` | **Ada** | Disamakan pada Tahap 2 | Tahap 2 ✓ |
| Item kartu: jam mulai–selesai, judul dicoret saat `done`, badge kategori & pembayaran, catatan, nominal IDR/FX (`.pv`), tanpa render link eksternal; empty state setara desktop aktif | `browser-app.js:2796-2804` | **Ada** | Disamakan pada Tahap 2; hapus pakai `mobTripConfirmDel` + Undo (Tahap 1) | Tahap 2 ✓ |
| Badge `Menginap: ...` dari pemesanan `Penginapan` & link klik `lnk(x.link)` pada kartu item | Hanya di `trip.js:269,274` *(tidak ada di `browser-app.js:2795-2803`)* | **Kode mati di desktop aktif (tidak diparitaskan)** | Tautan tetap disimpan lewat input `#m-it-link` & dipakai ekspor Tahap 4 | — |

### G. Subtab `Pemesanan` (`book`)
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Kartu ringkasan atas: `Total Pemesanan`, `Sudah Dibayar`, `Belum Dibayar` | `browser-app.js:2810` | **Ada** | Disamakan pada Tahap 3 | Tahap 3 ✓ |
| Form lengkap desktop aktif: `Nama`, `Jumlah` + mata uang `FX`, `Mulai / Check-in (a)`, `Selesai / Check-out (b)`, `Kategori (BCAT)` + daftar menampilkan ikon `.cat-logo`, rentang tanggal `a – b`, `.pv` terkonversi, & `Batal` edit | `browser-app.js:2811-2824` | **Ada** | Disamakan pada Tahap 3; edit memerge 6 field form sambil mempertahankan `pay, link, paid, rec` | Tahap 3 ✓ |
| Input `pay` & `link` pada form Pemesanan + pengelompokan daftar per kategori `BCAT` | Hanya di `trip.js:293-294,301-314` *(tidak ada di `browser-app.js:2811-2824`)* | **Kode mati di desktop aktif (tidak diparitaskan)** | Data `pay`/`link` lama tetap dipertahankan aman saat edit (Tahap 1 & 3) | — |
| Hapus dengan `askConfirm` + `snap()` + toast Undo | `mobTripConfirmDel` (APK) | **Ada** | Disamakan pada Tahap 1 | Tahap 1 ✓ |

### H. Subtab `Checklist` (`cek`)
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Counter `N dari M siap (%)`, progress bar `.rank-track/.rank-fill`, teks `Isi Daftar Standar`, input `maxlength="60"`, & pertahankan scroll saat toggle/hapus | `browser-app.js:2828-2835` | **Ada** | Disamakan pada Tahap 3; toggle/hapus memakai `mobPreserveScroll` | Tahap 3 ✓ |
| Tambah, `Isi Daftar Standar`, toggle selesai, hapus dgn `askConfirm` + Undo | `browser-app.js:2831-2835` | **Ada** | Konfirmasi + Undo diselesaikan Tahap 1 | Tahap 1 ✓ |

### I. Subtab `Catatan & Tautan` (`cat`)
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| `Tautan Berguna` (`tr.lk`: tambah judul + URL otomatis `https://`, escape `esc()`, blokir `javascript:`, buka via Capacitor Browser / tab aman, hapus dgn `askConfirm` + Undo) | `browser-app.js:2838-2842,4222-4226` | **Ada** | Disamakan pada Tahap 3; `#m-trip-lk-form` muncul sebelum `Catatan Penting` | Tahap 3 ✓ |
| `Catatan Penting` auto-save (`tr.note`) | `browser-app.js:2843-2844` | **Ada** | `#m-trip-note` + subjudul desktop aktif | Tahap 3 ✓ |

### J. Subtab `Tabungan` (`sv`)
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Form field `Sudah Terkumpul (s0)`, select `Hubungkan ke Rincian (link)`, tombol `Batal`, & tampilan progres `Terkumpul ... dari ...` + `%` + `Ubah Target / Hapus Target` | `browser-app.js:2846-2869` | **Ada** | Disamakan pada Tahap 3; memakai rumus progres desktop aktif + validasi `goalCompute` | Tahap 3 ✓ |
| Dropdown `goalOpts`, preview live `goalPrev`, tombol cepat `Putuskan/Sambungkan`, badge dampak Rincian | Hanya di `trip.js:687-706` *(tidak ada di `browser-app.js:2846-2869`)* | **Kode mati di desktop aktif (tidak diparitaskan)** | — | — |

### K. Bagikan Itinerary (`#modal-trip-share`) & L. Impor/Template Excel (`#xlf`)
| Butir Fitur | Referensi Kode Desktop | Status APK | Catatan Verifikasi Kode | Target Tahap |
| --- | --- | --- | --- | --- |
| Sheet Bagikan (`Sertakan rincian biaya`, WhatsApp / `navigator.share`, Salin teks, Cetak / PDF) | `browser-app.js:3789-3800`, `trip.js:1468-1554` | **Tidak ada** | Dijadwalkan Tahap 4 | Tahap 4 |
| Impor file `.xlsx` (`xlParse`) & Unduh `template-itinerary.xlsx` (`xlTemplate`) | `browser-app.js:3256-3279`, `trip.js:1219-1465` | **Tidak ada** | Dijadwalkan Tahap 4 | Tahap 4 |
