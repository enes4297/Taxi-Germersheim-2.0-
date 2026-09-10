(function () {
  'use strict';

  const wheelSegments = [
    { label: '5', unit: 'Punkte' },
    { label: '10', unit: 'Punkte' },
    { label: '20', unit: 'Punkte' },
    { label: '30', unit: 'Punkte' },
    { label: '50', unit: 'Punkte', featured: true },
    { label: '20 €', unit: 'Gutschein', featured: true },
    { label: 'Box', unit: 'Yumaks', box: true }
  ];

  const statusLoading = document.querySelector('[data-gw-status-loading]');
  const statusGuest = document.querySelector('[data-gw-status-guest]');
  const statusContent = document.querySelector('[data-gw-status-content]');
  const statusError = document.querySelector('[data-gw-status-error]');
  const voucherLink = document.querySelector('[data-gw-voucher-link]');
  const wheelFeature = document.querySelector('[data-gw-wheel-state]');
  const wheelStatus = document.querySelector('[data-gw-wheel-status]');
  const wheelDetail = document.querySelector('[data-gw-wheel-detail]');
  const wheelLogin = document.querySelector('[data-gw-wheel-login]');
  const wheelAction = document.querySelector('[data-gw-wheel-action]');
  const boxFeature = document.querySelector('[data-gw-box-mode]');
  const boxState = document.querySelector('[data-gw-box-state]');
  const boxDetail = document.querySelector('[data-gw-box-detail]');
  const boxAction = document.querySelector('[data-gw-box-action]');
  const historyGuest = document.querySelector('[data-gw-history-guest]');
  const historyLoading = document.querySelector('[data-gw-history-loading]');
  const historyList = document.querySelector('[data-gw-history-list]');
  const historyEmpty = document.querySelector('[data-gw-history-empty]');
  const historyError = document.querySelector('[data-gw-history-error]');

  function setHidden(node, hidden) {
    if (node) node.hidden = hidden;
  }

  function setBoxState(mode, title, detail, showAction) {
    boxFeature.dataset.gwBoxMode = mode;
    boxState.textContent = title;
    boxDetail.textContent = detail;
    boxAction.hidden = !showAction;
    boxAction.disabled = true;
  }

  function polarPoint(center, radius, angleDegrees) {
    const angle = (angleDegrees - 90) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  }

  function createSvgNode(name, attributes) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attributes || {}).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    return node;
  }

  function renderWheel() {
    const svg = document.querySelector('[data-gw-wheel-svg]');
    if (!svg) return;
    const center = 200;
    const radius = 174;
    const labelRadius = 122;
    const slice = 360 / wheelSegments.length;

    wheelSegments.forEach(function (segment, index) {
      const startAngle = index * slice;
      const endAngle = (index + 1) * slice;
      const start = polarPoint(center, radius, startAngle);
      const end = polarPoint(center, radius, endAngle);
      const path = createSvgNode('path', {
        d: 'M ' + center + ' ' + center + ' L ' + start.x.toFixed(3) + ' ' + start.y.toFixed(3) +
          ' A ' + radius + ' ' + radius + ' 0 0 1 ' + end.x.toFixed(3) + ' ' + end.y.toFixed(3) + ' Z',
        class: 'gw-wheel-segment' + (segment.featured ? ' is-featured' : '') + (segment.box ? ' is-box' : '')
      });
      svg.appendChild(path);

      const middleAngle = startAngle + slice / 2;
      const labelPoint = polarPoint(center, labelRadius, middleAngle);
      const label = createSvgNode('text', {
        x: labelPoint.x.toFixed(3),
        y: (labelPoint.y - 5).toFixed(3),
        class: 'gw-wheel-label'
      });
      label.textContent = segment.label;
      svg.appendChild(label);

      const unit = createSvgNode('text', {
        x: labelPoint.x.toFixed(3),
        y: (labelPoint.y + 10).toFixed(3),
        class: 'gw-wheel-label gw-wheel-label-unit'
      });
      unit.textContent = segment.unit;
      svg.appendChild(unit);
    });

    svg.appendChild(createSvgNode('circle', {
      cx: center,
      cy: center,
      r: radius,
      fill: 'none',
      stroke: 'rgba(240, 217, 149, 0.5)',
      'stroke-width': '2'
    }));
  }

  function formatNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? new Intl.NumberFormat('de-DE').format(numeric) : '—';
  }

  function formatLevel(value) {
    const levels = {
      bronze: 'Bronze',
      silver: 'Silber',
      gold: 'Gold',
      platinum: 'Platin',
      vip: 'VIP'
    };
    return levels[String(value || '').toLowerCase()] || '—';
  }

  function hasCustomerSession(auth) {
    const snapshot = auth && typeof auth.getSessionSnapshot === 'function' ? auth.getSessionSnapshot() : null;
    return Boolean(
      snapshot &&
      snapshot.session &&
      snapshot.user &&
      snapshot.user.id &&
      snapshot.user.is_anonymous !== true &&
      (snapshot.linked === true || Boolean(snapshot.customerId))
    );
  }

  function showGuestState() {
    document.body.dataset.gameworldAuth = 'guest';
    wheelFeature.dataset.gwWheelState = 'locked';
    setHidden(statusLoading, true);
    setHidden(statusContent, true);
    setHidden(statusError, true);
    setHidden(statusGuest, false);
    setHidden(voucherLink, true);
    setHidden(wheelLogin, false);
    setHidden(wheelAction, true);
    wheelStatus.textContent = 'Dein persönlicher Drehstatus wartet nach der Anmeldung.';
    wheelDetail.textContent = 'Es werden keine Beispielwerte angezeigt.';
    historyGuest.hidden = false;
    setHidden(historyLoading, true);
    setHidden(historyList, true);
    setHidden(historyEmpty, true);
    setHidden(historyError, true);
    setBoxState('guest', 'Status nach Anmeldung verfügbar', 'Melde dich an, um deinen echten Box-Status zu sehen.', false);
  }

  function renderMemberStatus(rewards) {
    document.body.dataset.gameworldAuth = 'member';
    setHidden(statusLoading, true);
    setHidden(statusGuest, true);
    setHidden(statusError, true);
    setHidden(statusContent, false);
    setHidden(voucherLink, false);
    document.querySelector('[data-gw-points]').textContent = formatNumber(rewards.points_balance);
    document.querySelector('[data-gw-level]').textContent = formatLevel(rewards.level);
    document.querySelector('[data-gw-spins]').textContent = formatNumber(rewards.available_spins);

    const spins = Math.max(0, Number(rewards.available_spins) || 0);
    const status = String(rewards.status || '').toLowerCase();
    wheelLogin.hidden = true;
    wheelAction.hidden = false;
    wheelAction.disabled = true;

    if (status === 'paused' || status === 'blocked') {
      wheelFeature.dataset.gwWheelState = 'unavailable';
      wheelStatus.textContent = status === 'paused' ? 'Dein Rewards-Konto ist pausiert.' : 'Dein Rewards-Konto ist gesperrt.';
      wheelDetail.textContent = 'Das Glücksrad ist für dieses Konto nicht verfügbar.';
      wheelAction.textContent = 'Nicht verfügbar';
      return;
    }

    if (spins > 0) {
      wheelFeature.dataset.gwWheelState = 'available';
      wheelStatus.textContent = spins === 1 ? '1 Dreh verfügbar' : formatNumber(spins) + ' Drehs verfügbar';
      wheelDetail.textContent = 'Dein Dreh bleibt erhalten. Die sichere Kundenspielfreigabe folgt.';
      wheelAction.textContent = 'Bald verfügbar';
      return;
    }

    wheelFeature.dataset.gwWheelState = 'empty';
    wheelStatus.textContent = 'Derzeit kein Dreh verfügbar';
    wheelDetail.textContent = 'Dein Rewards-Konto weist aktuell keinen verfügbaren Dreh aus.';
    wheelAction.textContent = 'Kein Dreh verfügbar';
  }

  function showRewardsError() {
    wheelFeature.dataset.gwWheelState = 'error';
    setHidden(statusLoading, true);
    setHidden(statusGuest, true);
    setHidden(statusContent, true);
    setHidden(statusError, false);
    setHidden(voucherLink, true);
    setHidden(wheelLogin, true);
    setHidden(wheelAction, false);
    wheelAction.disabled = true;
    wheelAction.textContent = 'Nicht verfügbar';
    wheelStatus.textContent = 'Das Glücksrad ist gerade nicht verfügbar.';
    wheelDetail.textContent = 'Deine echten Rewards-Daten konnten nicht geladen werden.';
  }

  function resetHistoryStates() {
    historyGuest.hidden = true;
    historyLoading.hidden = true;
    historyList.hidden = true;
    historyEmpty.hidden = true;
    historyError.hidden = true;
  }

  function formatPrize(spin) {
    const points = Number(spin && spin.points_awarded);
    if (Number.isFinite(points) && points > 0) return formatNumber(points) + ' Punkte';
    if (spin && spin.prize_type === 'voucher_20') return '20,00 € Gutschein';
    if (spin && spin.prize_type === 'yumaks_box') return 'Yumaks Box';
    return 'Reward';
  }

  function formatDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Datum nicht verfügbar';
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  function renderHistory(spins) {
    resetHistoryStates();
    historyList.replaceChildren();
    if (!Array.isArray(spins) || !spins.length) {
      historyEmpty.hidden = false;
      setBoxState('locked', 'Derzeit keine Box verfügbar', 'Eine Box erscheint hier nur nach einem bestätigten Gewinn.', false);
      return;
    }

    spins.forEach(function (spin) {
      const item = document.createElement('li');
      const copy = document.createElement('div');
      const reward = document.createElement('strong');
      const date = document.createElement('time');
      const state = document.createElement('span');
      reward.textContent = formatPrize(spin);
      date.dateTime = spin.created_at || '';
      date.textContent = formatDate(spin.created_at);
      state.textContent = spin.prize_type === 'yumaks_box' && spin.fulfillment_status === 'pending'
        ? 'Bearbeitung ausstehend'
        : 'Bestätigt';
      copy.append(reward, document.createElement('br'), date);
      item.append(copy, state);
      historyList.appendChild(item);
    });

    const boxWin = spins.find(function (spin) { return spin.prize_type === 'yumaks_box'; });
    if (!boxWin) {
      setBoxState('locked', 'Derzeit keine Box verfügbar', 'Eine Box erscheint hier nur nach einem bestätigten Gewinn.', false);
    } else if (['fulfilled', 'completed', 'delivered'].includes(String(boxWin.fulfillment_status || '').toLowerCase())) {
      setBoxState('complete', 'Deine Box wurde bearbeitet', 'Der bestätigte Box-Gewinn ist bereits abgeschlossen.', false);
    } else {
      setBoxState('available', 'Deine Box ist bereit', 'Der Gewinn ist bestätigt. Die sichere Kundenöffnung ist noch nicht freigeschaltet.', true);
    }

    historyList.hidden = false;
  }

  async function loadHistory(client, rewardsAccountId) {
    resetHistoryStates();
    historyLoading.hidden = false;
    try {
      if (!client || typeof client.from !== 'function' || !rewardsAccountId) {
        throw new Error('REWARDS_HISTORY_UNAVAILABLE');
      }
      const result = await client
        .from('rewards_wheel_spins')
        .select('id, prize_type, points_awarded, created_at, fulfillment_status')
        .eq('rewards_account_id', rewardsAccountId)
        .order('created_at', { ascending: false })
        .limit(4);
      if (result.error) throw result.error;
      renderHistory(result.data || []);
    } catch (_error) {
      resetHistoryStates();
      historyError.hidden = false;
      setBoxState('error', 'Box-Status nicht verfügbar', 'Bitte versuche es später erneut.', false);
    }
  }

  async function initializeExperience() {
    const auth = window.CustomerAuth || null;
    try {
      if (auth && typeof auth.hydrateSession === 'function') {
        await auth.hydrateSession();
      }
    } catch (_error) {
      showGuestState();
      return;
    }

    if (!hasCustomerSession(auth)) {
      showGuestState();
      return;
    }

    document.body.dataset.gameworldAuth = 'member';
    historyGuest.hidden = true;
    historyLoading.hidden = false;
    try {
      const client = typeof auth.getClient === 'function' ? await auth.getClient() : null;
      if (!client || typeof client.rpc !== 'function') {
        throw new Error('REWARDS_CLIENT_UNAVAILABLE');
      }
      const result = await client.rpc('get_my_rewards_overview');
      if (result.error || !result.data) {
        throw result.error || new Error('REWARDS_OVERVIEW_UNAVAILABLE');
      }
      renderMemberStatus(result.data);
      await loadHistory(client, result.data.rewards_account_id);
    } catch (_error) {
      showRewardsError();
      resetHistoryStates();
      historyError.hidden = false;
      setBoxState('error', 'Box-Status nicht verfügbar', 'Bitte versuche es später erneut.', false);
    }
  }

  renderWheel();
  initializeExperience();
})();