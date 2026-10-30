/* STU-Town environment and weather module.
 * Weather effects are presentation-only. Outdoor particle effects are scoped
 * to outdoor maps; day/night lighting remains available indoors.
 */

function updateEnvironmentClock() {
    const now = new Date();
    const clock = document.getElementById('environment-clock');
    if (!clock) return;
    clock.textContent = now.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
      updateEnvironmentIcon();
  }

  function updateEnvironmentIcon() {
      const hud = document.getElementById('environment-hud');
      const button = document.getElementById('environment-toggle');
      if (!hud || !button) return;
      const collapsed = hud.classList.contains('is-collapsed');
      const hour = Number(new Intl.DateTimeFormat('en', {
          timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23'
      }).format(new Date()));
      const isDay = typeof environmentConditions?.isDay === 'boolean' ? environmentConditions.isDay : hour >= 6 && hour < 18;
      const code = Number(environmentConditions?.weatherCode);
      let icon = isDay ? '☀️' : '🌙';
      if ([45, 48].includes(code)) icon = '🌫️';
      else if (code >= 95) icon = '⛈️';
      else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) icon = '🌧️';
      else if (code === 2 || code === 3) icon = '☁️';
      else if (code === 1) icon = '🌤️';
      button.textContent = collapsed ? icon : '−';
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-label', collapsed ? 'Mở thông tin thời gian và thời tiết' : 'Thu gọn thông tin thời gian và thời tiết');
      button.title = `${document.getElementById('environment-clock')?.textContent || ''} · ${document.getElementById('environment-condition')?.textContent || 'Thời tiết'}`;
}

function positionEnvironmentHud() {
    const hud = document.getElementById('environment-hud');
    const canvas = document.querySelector('canvas');
    if (!hud || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    hud.style.left = `${bounds.right - 10}px`;
    hud.style.top = `${bounds.bottom - 10}px`;
}

function describeWeather(code) {
    if (code === 0) return '☀️ Trời quang';
    if ([1, 2].includes(code)) return '🌤️ Có mây';
    if (code === 3) return '☁️ Nhiều mây';
    if ([45, 48].includes(code)) return '🌫️ Sương mù';
    if (code >= 51 && code <= 57) return '🌦️ Mưa phùn';
    if (code >= 61 && code <= 67) return '🌧️ Có mưa';
    if (code >= 71 && code <= 77) return '❄️ Có tuyết';
    if (code >= 80 && code <= 82) return '🌧️ Mưa rào';
    if ([85, 86].includes(code)) return '🌨️ Mưa tuyết';
    if (code >= 95) return '⛈️ Dông';
    return '🌤️ Thời tiết hiện tại';
}

async function loadEnvironmentConditions() {
    const condition = document.getElementById('environment-condition');
    if (!condition) return;
    try {
        const response = await fetch(`${serverUrl}/api/environment`, { headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        environmentConditions = await response.json();
        const temperature = Number.isFinite(environmentConditions.temperature)
            ? ` · ${Math.round(environmentConditions.temperature)}°C` : '';
        condition.textContent = `${describeWeather(environmentConditions.weatherCode)}${temperature}`;
        document.getElementById('environment-location').textContent = environmentConditions.stale
            ? 'Chánh Hưng · dữ liệu thời tiết lưu gần nhất'
            : 'Chánh Hưng · TP. Hồ Chí Minh';
          updateEnvironmentIcon();
    } catch (error) {
        condition.textContent = 'Chưa tải được thời tiết';
          updateEnvironmentIcon();
        console.warn('Không tải được thời tiết Chánh Hưng:', error);
    }
}

function getLocalMoonIllumination(date = new Date()) {
    // Approximate synodic phase (29.530588853 days); 0=new, 0.5=full.
    const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
    const synodicMonth = 29.530588853 * 86400000;
    const phase = ((date.getTime() - knownNewMoon) % synodicMonth + synodicMonth) % synodicMonth / synodicMonth;
    return (1 - Math.cos(phase * Math.PI * 2)) / 2;
}

function renderEnvironmentOverlay(time, delta) {
    if (!environmentOverlay) return;
    environmentOverlay.clear();

    const hour = Number(new Intl.DateTimeFormat('en', {
        timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23'
    }).format(new Date()));
    const isDay = typeof environmentConditions?.isDay === 'boolean'
        ? environmentConditions.isDay : hour >= 6 && hour < 18;
    const cloudCover = Math.max(0, Math.min(100, Number(environmentConditions?.cloudCover) || 0));
    const code = Number(environmentConditions?.weatherCode);
    const rain = Number(environmentConditions?.rain) || 0;
    const showers = Number(environmentConditions?.showers) || 0;
    const isWet = rain > 0 || showers > 0 || (code >= 51 && code <= 67)
        || (code >= 80 && code <= 82) || code >= 95;
    const isStorm = code >= 95;
    const isFog = code === 45 || code === 48;
    // Only these maps are physically outdoors. Indoor maps still receive the
    // global day/night lighting, but never clouds, rain, puddles or fog.
    const isOutdoorMap = ['campus', 'sports', 'fountain', 'farm'].includes(currentMapId);

    // Stable pseudo-random values: natural-looking variation without flicker
    // from generating fresh random positions on every animation frame.
    const randomAt = (seed) => {
        const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return value - Math.floor(value);
    };

    if (!isDay) {
        const moon = getLocalMoonIllumination(new Date());
        const darkness = 0.43 - moon * 0.17;
        environmentOverlay.fillStyle(0x101a39, darkness).fillRect(0, 0, 800, 600);
        if (isOutdoorMap && moon > 0.18) {
            environmentOverlay.fillStyle(0xe4edff, 0.025 + moon * 0.035).fillRect(0, 0, 800, 600);
        }
    } else {
        const sunlight = Math.max(0, 0.12 - cloudCover * 0.0011);
        if (sunlight > 0.015) {
            environmentOverlay.fillStyle(0xffe6a1, sunlight).fillRect(0, 0, 800, 600);
        }
        if (isOutdoorMap && cloudCover >= 35) {
            // Each cloud shadow gets its own random starting point, shape,
            // drift vector and speed. Shadows wrap independently at the edges.
            const count = Math.ceil(cloudCover / 12);
            const elapsed = time / 1000;
            for (let index = 0; index < count; index++) {
                // The same seed is shared by all outdoor maps so the cloud field
                // feels continuous when players move between connected areas.
                const seed = index + 1;
                const speed = 5 + randomAt(seed * 4) * 13;
                const direction = randomAt(seed * 7) > 0.5 ? 1 : -1;
                const startX = randomAt(seed * 11) * 1000 - 100;
                const startY = 35 + randomAt(seed * 13) * 520;
                const x = ((startX + direction * speed * elapsed + 100) % 1000 + 1000) % 1000 - 100;
                const y = startY + Math.sin(elapsed * (0.18 + randomAt(seed * 17) * 0.3) + seed) * 9;
                const width = 65 + randomAt(seed * 19) * 105;
                const height = 12 + randomAt(seed * 23) * 17;
                const alpha = Math.min(0.18, cloudCover / 680) * (0.72 + randomAt(seed * 29) * 0.5);
                const lobes = 2 + Math.floor(randomAt(seed * 31) * 3);
                environmentOverlay.fillStyle(0x33424b, alpha);
                environmentOverlay.fillEllipse(x, y, width, height);
                for (let lobe = 0; lobe < lobes; lobe++) {
                    const offset = (randomAt(seed * 37 + lobe) - 0.5) * width * 0.8;
                    const lobeWidth = width * (0.22 + randomAt(seed * 41 + lobe) * 0.35);
                    const lobeHeight = height * (0.65 + randomAt(seed * 43 + lobe) * 0.65);
                    environmentOverlay.fillEllipse(x + offset, y - height * 0.12, lobeWidth, lobeHeight);
                }
            }
        }
    }

    if (!isOutdoorMap) return;
    if (isFog) {
        environmentOverlay.fillStyle(0xcbd7d4, 0.12).fillRect(0, 0, 800, 600);
        const elapsed = time / 1000;
        for (let i = 0; i < 6; i++) {
            const seed = i + 81;
            const speed = 3 + randomAt(seed) * 8;
            const direction = randomAt(seed * 2) > 0.5 ? 1 : -1;
            const x = ((randomAt(seed * 3) * 1000 + direction * speed * elapsed) % 1100 + 1100) % 1100 - 150;
            const y = 45 + randomAt(seed * 4) * 500;
            environmentOverlay.fillStyle(0xe5efea, 0.045 + randomAt(seed * 5) * 0.055)
                .fillEllipse(x, y, 130 + randomAt(seed * 6) * 190, 12 + randomAt(seed * 7) * 24);
        }
    }

    if (isWet) {
        const intensity = Math.min(1, Math.max(0.35, rain / 3, showers / 3, isStorm ? 0.9 : 0));
        const elapsed = time / 1000;
        const dropCount = Math.round(45 + intensity * 95);
        for (let index = 0; index < dropCount; index++) {
            const seed = index + 201;
            const speed = (90 + randomAt(seed * 3) * 150) * (0.65 + intensity * 0.65);
            const xBase = randomAt(seed * 5) * 820 - 10;
            const yBase = randomAt(seed * 7) * 640 - 20;
            const slant = (randomAt(seed * 11) - 0.5) * (isStorm ? 22 : 12);
            const x = ((xBase + slant * elapsed * 0.18) % 840 + 840) % 840 - 20;
            const y = ((yBase + speed * elapsed) % 660 + 660) % 660 - 30;
            const length = (7 + randomAt(seed * 13) * 10) * (isStorm ? 1.35 : 1);
            environmentOverlay.lineStyle(0.7 + randomAt(seed * 17) * 0.8,
                isDay ? 0xc5e5f2 : 0x9aadd2, 0.16 + intensity * 0.24);
            environmentOverlay.lineBetween(x, y, x + slant * 0.12, y + length);
        }

        if (intensity > 0.45) {
            // Scattered glints appear at irregular positions and pulse at
            // different rates, rather than forming repeating diagonal rows.
            for (let i = 0; i < 16; i++) {
                const seed = i + 401;
                const x = 12 + randomAt(seed * 3) * 776;
                const y = 18 + randomAt(seed * 5) * 564;
                const pulse = (Math.sin(time * (0.001 + randomAt(seed * 7) * 0.002) + seed) + 1) / 2;
                environmentOverlay.lineStyle(1, 0xc4e8f2, 0.06 + pulse * 0.17)
                    .lineBetween(x, y, x + 5 + randomAt(seed * 11) * 13, y - 1);
            }
        }
    }
}
