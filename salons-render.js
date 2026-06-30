/*
 * 店舗データの描画ロジック（Node ビルド時とブラウザ実行時の両方で使う共有モジュール）
 * - カードHTML / 比較表HTML / JSON-LD を生成
 * - これをビルド時に静的HTMLへ埋め込むことで、JSを実行しないAI検索クローラーにも
 *   全データが見える状態になる（AIO最適化の要）
 */
(function (root) {
  function starsHtml(rating) {
    if (rating === 0) return '<span style="color:#ccc">☆☆☆☆☆</span>';
    const full = Math.floor(rating);
    const half = (rating - full) >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '<span style="color:#ddd">★</span>'.repeat(empty);
  }
  function gmapLink(address) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
  }
  function gmapReviewLink(s) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + s.address);
  }
  function CATEGORY_IMG(type) {
    const m = {
      salon:  'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=600&q=70&auto=format&fit=crop',
      cat:    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&q=70&auto=format&fit=crop',
      hotel:  'https://images.unsplash.com/photo-1559190394-df5a28aab5c5?w=600&q=70&auto=format&fit=crop',
      clinic: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&q=70&auto=format&fit=crop',
      shop:   'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=600&q=70&auto=format&fit=crop',
    };
    return m[type] || m.salon;
  }
  function badgeHtml(s) {
    if (s.type === 'hotel') return '<div class="card-badge hotel">ホテル併設</div>';
    if (s.type === 'cat')   return '<div class="card-badge cat">猫専門</div>';
    if (s.type === 'clinic') return '<div class="card-badge hotel">病院併設</div>';
    if (s.rating >= 4.8)    return '<div class="card-badge">人気店</div>';
    return '';
  }
  function rankHtml(s) {
    return (s._rank && s._rank <= 3) ? '<div class="card-rank">編集部おすすめ ' + s._rank + '位</div>' : '';
  }

  // 編集部おすすめスコア（評価×口コミ件数の信頼度）でランク付け
  function rankSalons(salons) {
    function score(s) { return s.rating === 0 ? -1 : s.rating * 10 + Math.min(s.ratingCount, 50) * 0.4; }
    const ranked = salons.slice().sort((a, b) => score(b) - score(a));
    ranked.forEach((s, i) => { s._rank = i + 1; });
    return ranked;
  }

  // カード1枚のHTML
  function cardHtml(s) {
    const featTags = (s.features && s.features.length)
      ? '<div class="card-feature-tags">' + s.features.slice(0, 3).map(f => '<span class="card-feat">' + f + '</span>').join('') + '</div>' : '';
    const tel = s.tel
      ? '<a class="btn-tel" href="tel:' + s.tel + '" onclick="event.stopPropagation()">📞 電話する</a>'
      : '<span class="btn-tel" style="opacity:0.4;cursor:default">📞 番号非公開</span>';
    const ratingNum = s.rating > 0 ? s.rating.toFixed(1) : '-';
    const ratingCount = s.ratingCount > 0 ? '(' + s.ratingCount + '件)' : '(口コミなし)';
    return '' +
      '<div class="card" onclick="openModal(' + (s.no) + ')" data-no="' + s.no + '">' +
        '<div class="card-img" style="background-image:url(\'' + CATEGORY_IMG(s.type) + '\')">' +
          badgeHtml(s) + rankHtml(s) +
          '<span class="card-emoji">' + s.emoji + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-name">' + s.name + '</div>' +
          '<div class="card-address">' + s.address + '</div>' +
          '<div class="card-rating">' +
            '<span class="stars">' + starsHtml(s.rating) + '</span>' +
            '<span class="rating-num">' + ratingNum + '</span>' +
            '<span class="rating-count">' + ratingCount + '</span>' +
          '</div>' +
          featTags +
          '<div class="card-comment"><b>編集部メモ：</b>' + s.comment + '</div>' +
          '<div class="card-footer">' + tel +
            '<a class="btn-map" href="' + gmapLink(s.address) + '" target="_blank" onclick="event.stopPropagation()">🗺 地図</a>' +
          '</div>' +
          '<a class="btn-review" href="' + gmapReviewLink(s) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">⭐ Googleマップで口コミを見る</a>' +
        '</div>' +
      '</div>';
  }

  // 比較表の行HTML
  function compareRowHtml(s) {
    const rankBadge = (s._rank && s._rank <= 3) ? '<span class="ct-rank">' + s._rank + '位</span>' : '';
    const rating = s.rating > 0 ? '★' + s.rating.toFixed(1) : '—';
    const reviews = s.ratingCount > 0 ? s.ratingCount + '件' : '—';
    const hours = (s.hours && s.hours !== '記載なし') ? s.hours : '—';
    const feat = (s.features && s.features.length) ? s.features.slice(0, 2).join('・') : '—';
    return '<tr onclick="openModal(' + s.no + ')">' +
      '<td class="ct-name">' + rankBadge + s.name + '</td>' +
      '<td>' + s.area + '</td>' +
      '<td class="ct-rating">' + rating + '</td>' +
      '<td>' + reviews + '</td>' +
      '<td>' + (s.pets || '—') + '</td>' +
      '<td>' + hours + '</td>' +
      '<td class="ct-feat">' + feat + '</td>' +
      '</tr>';
  }

  // ItemList JSON-LD（店舗データ）
  function itemListLd(ranked, allCount, name, description, areaLabel) {
    const items = ranked.map((s, i) => {
      const item = {
        '@type': ['LocalBusiness', 'PetStore'],
        'name': s.name,
        'description': s.profile || s.comment,
        'address': { '@type': 'PostalAddress', 'streetAddress': s.address, 'addressLocality': '吹田市', 'addressRegion': '大阪府', 'addressCountry': 'JP' },
        'areaServed': areaLabel + '（' + s.area + '）'
      };
      if (typeof s.lat === 'number' && typeof s.lng === 'number') {
        item.geo = { '@type': 'GeoCoordinates', 'latitude': s.lat, 'longitude': s.lng };
      }
      if (s.tel) item.telephone = s.tel;
      if (s.hours && s.hours !== '記載なし') item.openingHours = s.hours;
      if (s.services && s.services.length) item.makesOffer = s.services.map(v => ({ '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': v } }));
      if (s.rating > 0) item.aggregateRating = { '@type': 'AggregateRating', 'ratingValue': s.rating, 'reviewCount': Math.max(s.ratingCount, 1), 'bestRating': 5, 'sourceOrganization': { '@type': 'Organization', 'name': s.source || 'EPARKペットライフ', 'url': 'https://petlife.asia/' } };
      return { '@type': 'ListItem', 'position': i + 1, 'item': item };
    });
    return {
      '@context': 'https://schema.org', '@type': 'ItemList',
      'name': name, 'description': description, 'numberOfItems': allCount,
      'isBasedOn': { '@type': 'WebSite', 'name': 'EPARKペットライフ', 'url': 'https://petlife.asia/' },
      'itemListElement': items
    };
  }

  const api = { starsHtml, gmapLink, gmapReviewLink, CATEGORY_IMG, badgeHtml, rankHtml, rankSalons, cardHtml, compareRowHtml, itemListLd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SalonsRender = api;
})(typeof window !== 'undefined' ? window : this);
