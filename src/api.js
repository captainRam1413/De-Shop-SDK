const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  return response.json();
}

export async function fetchAssets(owner) {
  const query = owner ? `?owner=${encodeURIComponent(owner)}` : '';
  const data = await request(`/assets${query}`);
  return data.assets || [];
}

export async function mintAsset(payload) {
  return request('/mint', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
