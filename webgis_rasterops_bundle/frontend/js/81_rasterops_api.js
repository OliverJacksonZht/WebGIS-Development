(function () {
  function joinUrl(base, path) {
    if (base.endsWith('/')) base = base.slice(0, -1);
    if (!path.startsWith('/')) path = '/' + path;
    return base + path;
  }

  class RasterOpsAPI {
    constructor(baseUrl) {
      this.baseUrl = baseUrl || window.RASTEROPS_BASE_URL;
    }

    async listAssets() {
      const r = await fetch(joinUrl(this.baseUrl, '/api/assets'));
      if (!r.ok) throw new Error(await r.text());
      return await r.json();
    }

    async upload(file) {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(joinUrl(this.baseUrl, '/api/assets/upload'), {
        method: 'POST',
        body: fd,
      });
      if (!r.ok) throw new Error(await r.text());
      return await r.json();
    }

    async publish(assetId) {
      const r = await fetch(joinUrl(this.baseUrl, `/api/assets/${assetId}/publish`), {
        method: 'POST',
      });
      if (!r.ok) throw new Error(await r.text());
      return await r.json();
    }

    async createCalcJob(payload) {
      const r = await fetch(joinUrl(this.baseUrl, '/api/raster/calc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return await r.json();
    }

    async createFuseJob(payload) {
      const r = await fetch(joinUrl(this.baseUrl, '/api/raster/fuse'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return await r.json();
    }

    async getJob(jobId) {
      const r = await fetch(joinUrl(this.baseUrl, `/api/jobs/${jobId}`));
      if (!r.ok) throw new Error(await r.text());
      return await r.json();
    }
  }

  window.RasterOpsAPI = RasterOpsAPI;
})();
