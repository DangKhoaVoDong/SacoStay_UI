import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SACOSTAY_LOGO_URL } from '../../../utils/brand-assets';

const DISMISS_KEY = 'saco_apk_banner_dismissed';

/** Link Google Drive — file ID từ share link; uc?export=download để tải APK trực tiếp. */
export const SACOSTAY_APK_DOWNLOAD_URL =
  'https://drive.google.com/uc?export=download&id=10RRO-FWRuu9LdazAszBwBUnQ3tVTWd9T';

@Component({
  selector: 'app-apk-download-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './apk-download-banner.component.html',
  styleUrl: './apk-download-banner.component.css'
})
export class ApkDownloadBannerComponent implements OnInit {
  visible = false;
  readonly logoUrl = SACOSTAY_LOGO_URL;
  readonly downloadUrl = SACOSTAY_APK_DOWNLOAD_URL;

  ngOnInit(): void {
    if (typeof localStorage === 'undefined') return;
    this.visible = localStorage.getItem(DISMISS_KEY) !== '1';
  }

  dismiss(): void {
    this.visible = false;
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }
}
