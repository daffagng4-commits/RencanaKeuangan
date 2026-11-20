package id.renkeu.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.IOException;
import java.util.Locale;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean allowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            allowed = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("allowed", allowed);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + ctx.getPackageName())
                );
            } else {
                intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Gagal membuka pengaturan izin: " + ex.getLocalizedMessage(), ex);
        }
    }

    @PluginMethod
    public void install(PluginCall call) {
        String relPath = call.getString("path");
        if (relPath == null || relPath.trim().isEmpty()) {
            call.reject("Path APK wajib diisi");
            return;
        }
        String trimmed = relPath.trim();
        if (trimmed.startsWith("/") || trimmed.startsWith("\\") || trimmed.contains("..")) {
            call.reject("Path APK tidak valid");
            return;
        }
        try {
            Context ctx = getContext();
            File cacheDir = ctx.getCacheDir().getCanonicalFile();
            File updateDir = new File(cacheDir, "rk-update").getCanonicalFile();
            File apkFile = new File(cacheDir, trimmed).getCanonicalFile();
            String allowedPrefix = updateDir.getPath() + File.separator;
            if (!apkFile.getPath().startsWith(allowedPrefix)) {
                call.reject("Path APK harus berada di dalam cache/rk-update");
                return;
            }
            if (!apkFile.getName().toLowerCase(Locale.ROOT).endsWith(".apk")) {
                call.reject("Hanya berkas .apk yang diizinkan");
                return;
            }
            if (!apkFile.exists() || !apkFile.isFile()) {
                call.reject("Berkas APK tidak ditemukan");
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ctx.getPackageManager().canRequestPackageInstalls()) {
                call.reject("Izin pemasangan aplikasi belum diaktifkan");
                return;
            }
            Uri apkUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apkFile);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (IOException ioEx) {
            call.reject("Gagal memvalidasi path APK: " + ioEx.getLocalizedMessage(), ioEx);
        } catch (Exception ex) {
            call.reject("Gagal membuka pemasang APK: " + ex.getLocalizedMessage(), ex);
        }
    }
}
