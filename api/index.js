import axios from 'axios';
import qs from 'qs';
import * as cheerio from 'cheerio';
import FormData from 'form-data';
import yts from 'yt-search';

// Facebook Downloader (fdown)
const fdown = {
  getToken: async () => {
    try {
      const response = await axios.get('https://fdown.net', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        }
      });
      const $ = cheerio.load(response.data);
      return {
        token_v: $('input[name="token_v"]').val(),
        token_c: $('input[name="token_c"]').val(),
        token_h: $('input[name="token_h"]').val()
      };
    } catch (error) {
      throw new Error(`Error fetching tokens: ${error.message}`);
    }
  },

  download: async (url) => {
    const { token_v, token_c, token_h } = await fdown.getToken();
    const data = qs.stringify({
      'URLz': url,
      'token_v': token_v,
      'token_c': token_c,
      'token_h': token_h
    });

    const response = await axios.post('https://fdown.net/download.php', data, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'referer': 'https://fdown.net/',
      }
    });

    const $ = cheerio.load(response.data);
    return {
      normalQualityLink: $('#sdlink').attr('href'),
      hdQualityLink: $('#hdlink').attr('href')
    };
  }
};

// TikTok Downloader V1 (tikwm)
async function tiktokV1(query) {
  const encodedParams = new URLSearchParams();
  encodedParams.set('url', query);
  encodedParams.set('hd', '1');

  const { data } = await axios.post('https://tikwm.com/api/', encodedParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    }
  });

  return data;
}

// TikTok Downloader V2 (savetik)
async function tiktokV2(query) {
  const form = new FormData();
  form.append('q', query);

  const { data } = await axios.post('https://savetik.co/api/ajaxSearch', form, {
    headers: {
      ...form.getHeaders(),
      'Accept': '*/*',
      'Origin': 'https://savetik.co',
      'Referer': 'https://savetik.co/en2',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  const rawHtml = data.data;
  const $ = cheerio.load(rawHtml);
  const title = $('.thumbnail .content h3').text().trim();
  const thumbnail = $('.thumbnail .image-tik img').attr('src');
  const video_url = $('video#vid').attr('data-src');

  const slide_images = [];
  $('.photo-list .download-box li').each((_, el) => {
    const imgSrc = $(el).find('.download-items__thumb img').attr('src');
    if (imgSrc) slide_images.push(imgSrc);
  });

  return { title, thumbnail, video_url, slide_images };
}

// Spotify Downloader
async function spotifyDown(url) {
  const BASEURL = "https://api.fabdl.com";
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
  };

  try {
    const { data: info } = await axios.get(`${BASEURL}/spotify/get?url=${url}`, { headers });
    const { gid, id } = info.result;

    const { data: download } = await axios.get(`${BASEURL}/spotify/mp3-convert-task/${gid}/${id}`, { headers });
    
    return {
      downloadUrl: download.result.download_url ? `${BASEURL}${download.result.download_url}` : null,
      name: info.result.name,
      artist: info.result.artists,
      ...info.result
    };
  } catch (error) {
    throw new Error('Spotify download failed: ' + error.message);
  }
}

// Instagram/Threads Downloader
async function threadsDownload(url) {
  const { data } = await axios.get('https://www.abella.icu/dl-threads?url=' + encodeURIComponent(url));
  return data;
}

// TikTok Image Downloader (dlpanda)
async function tiktokImageDownload(url) {
  const mainUrl = `https://dlpanda.com/id?url=${url}&token=G7eRpMaa`;
  const backupUrl = `https://dlpanda.com/id?url=${url}&token51=G32254GLM09MN89Maa`;

  try {
    let response = await axios.get(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
      }
    });

    const $ = cheerio.load(response.data);
    let imgSrc = [];

    $('div.col-md-12 > img').each((index, element) => {
      imgSrc.push($(element).attr('src'));
    });

    if (imgSrc.length === 0) {
      response = await axios.get(backupUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
        }
      });

      const $2 = cheerio.load(response.data);
      $2('div.col-md-12 > img').each((index, element) => {
        imgSrc.push($2(element).attr('src'));
      });
    }

    return imgSrc;
  } catch (error) {
    throw new Error('TikTok image download failed: ' + error.message);
  }
}

// YouTube Downloader Class
class Youtubers {
  constructor() {
    this.hex = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  }

  async uint8(hex) {
    const pecahan = hex.match(/[\dA-F]{2}/gi);
    if (!pecahan) throw new Error("Format tidak valid");
    return new Uint8Array(pecahan.map(h => parseInt(h, 16)));
  }

  b64Byte(b64) {
    const bersih = b64.replace(/\s/g, "");
    const biner = Buffer.from(bersih, 'base64');
    return new Uint8Array(biner);
  }

  async key() {
    const raw = await this.uint8(this.hex);
    return await crypto.subtle.importKey("raw", raw, { name: "AES-CBC" }, false, ["decrypt"]);
  }

  async Data(base64Terenkripsi) {
    const byteData = this.b64Byte(base64Terenkripsi);
    if (byteData.length < 16) throw new Error("Data terlalu pendek");

    const iv = byteData.slice(0, 16);
    const data = byteData.slice(16);

    const kunci = await this.key();
    const hasil = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, kunci, data);

    const teks = new TextDecoder().decode(new Uint8Array(hasil));
    return JSON.parse(teks);
  }

  async getCDN() {
    let retries = 5;
    while (retries--) {
      try {
        const res = await axios.get("https://media.savetube.me/api/random-cdn");
        if (res.data?.cdn) return res.data.cdn;
      } catch {}
    }
    throw new Error("Gagal ambil CDN setelah 5 percobaan");
  }

  async infoVideo(linkYoutube) {
    const cdn = await this.getCDN();
    const res = await axios.post(
      `https://${cdn}/v2/info`,
      { url: linkYoutube },
      { headers: { "Content-Type": "application/json" }}
    );

    if (!res.data.status) throw new Error(res.data.message || "Gagal ambil data video");

    const isi = await this.Data(res.data.data);

    return {
      judul: isi.title,
      durasi: isi.durationLabel,
      thumbnail: isi.thumbnail,
      kode: isi.key
    };
  }

  async getDownloadLink(kodeVideo, kualitas) {
    let retries = 5;
    while (retries--) {
      try {
        const cdn = await this.getCDN();
        const res = await axios.post(
          `https://${cdn}/download`,
          { downloadType: 'video', quality: kualitas, key: kodeVideo },
          { headers: { "Content-Type": "application/json" }}
        );

        if (res.data?.status && res.data?.data?.downloadUrl) {
          return res.data.data.downloadUrl;
        }
      } catch {}
    }
    throw new Error("Gagal ambil link unduh setelah 5 percobaan");
  }

  async downloadVideo(linkYoutube, kualitas = '360') {
    try {
      const data = await this.infoVideo(linkYoutube);
      const url = await this.getDownloadLink(data.kode, kualitas);
      return { status: true, ...data, url };
    } catch (err) {
      return { status: false, pesan: err.message };
    }
  }
}

// Audio Download Helper
const formatAudio = ['mp3', 'm4a', 'webm', 'acc', 'flac', 'opus', 'ogg', 'wav'];

const ddownr = {
  download: async (url, format) => {
    if (!formatAudio.includes(format)) throw new Error('Format tidak didukung');

    const response = await axios.get(
      `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }}
    );

    if (!response.data?.success) throw new Error("Gagal mengambil detail video.");

    return await ddownr.cekProgress(response.data.id);
  },

  cekProgress: async (id) => {
    while (true) {
      const res = await axios.get(`https://p.oceansaver.in/ajax/progress.php?id=${id}`);
      if (res.data?.success && res.data?.progress === 1000) {
        return res.data.download_url;
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

const ytdlAudio = async(searchQuery) => {
  const search = await yts(searchQuery);
  const video = search.all[0];
  const downloadUrl = await ddownr.download(video.url, "mp3");
  return {
    title: video.title,
    url: downloadUrl,
    thumbnail: video.thumbnail,
    duration: video.timestamp
  };
};

// Main Serverless Handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse path dari req.url
  const path = req.url || '/';
  console.log('Request path:', path);
  console.log('Request method:', req.method);

  // Health Check
  if (path === '/api/health' && req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'Server is running' });
  }

  // Facebook Download
  if (path.includes('/api/download/facebook') && req.method === 'POST') {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
      
      const result = await fdown.download(url);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // TikTok Download
  if (path.includes('/api/download/tiktok') && req.method === 'POST') {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
      
      let result = await tiktokV1(url);
      
      if (!result?.data) {
        const v2Data = await tiktokV2(url);
        result = { data: v2Data };
      }

      if (result.data && !result.data.play && !result.data.video_url) {
        const images = await tiktokImageDownload(url);
        if (images.length > 0) {
          result.data.images = images;
        }
      }

      return res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Spotify Download
  if (path.includes('/api/download/spotify') && req.method === 'POST') {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
      
      const result = await spotifyDown(url);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Threads/Instagram Download
  if ((path.includes('/api/download/threads') || path.includes('/api/download/instagram')) && req.method === 'POST') {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
      
      const result = await threadsDownload(url);
      return res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Videy Download
  if (path.includes('/api/download/videy') && req.method === 'POST') {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
      
      const parsed = new URL(url);
      const id = parsed.searchParams.get('id');
      
      if (!id) throw new Error('Invalid URL: missing id parameter');
      
      const videoUrl = `https://cdn.videy.co/${id}.mp4`;
      return res.status(200).json({ success: true, data: { videoUrl, id } });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // YouTube Download
  if (path.includes('/api/download/youtube') && req.method === 'POST') {
    try {
      const { url, quality = '360', type = 'video' } = req.body;

      if (!url) return res.status(400).json({ success: false, error: "URL required" });

      if (type === "audio") {
        const result = await ytdlAudio(url);
        return res.status(200).json({ success: true, data: { type, ...result }});
      }

      const yt = new Youtubers();
      const result = await yt.downloadVideo(url, quality);

      if (!result.status) throw new Error(result.pesan);

      return res.status(200).json({ success: true, data: { type: 'video', ...result }});

    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // 404 Not Found
  console.log('404 - Endpoint not found:', path);
  return res.status(404).json({ success: false, error: 'Endpoint not found' });
}
