/* ===========================================================
   ui.js – fungsi bantu tampilan: escape, tanggal, toast, dialog form
   =========================================================== */
(function () {
  'use strict';

  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dateObj(s) { return new Date(s + 'T00:00:00'); }

  function fmtDate(s) {
    if (!s) return '';
    return dateObj(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function daysLeft(s) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((dateObj(s) - t) / 864e5);
  }

  function dueLabel(s) {
    var n = daysLeft(s);
    if (n < 0) return 'Terlambat ' + Math.abs(n) + ' hari';
    if (n === 0) return 'Hari ini';
    if (n === 1) return 'Besok';
    return n + ' hari lagi';
  }

  function initials(name) {
    return (name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* ---------- Dialog ---------- */
  function dlg() { return document.getElementById('modal'); }
  function openModal(title, html) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    var d = dlg();
    if (!d.open) d.showModal();
  }
  function closeModal() { var d = dlg(); if (d.open) d.close(); }

  function fieldHtml(f, v) {
    var val = v == null ? '' : v;
    var req = f.required ? ' required' : '';
    var input;
    if (f.type === 'textarea') {
      input = '<textarea name="' + f.name + '" rows="' + (f.rows || 4) + '"' + req + '>' + esc(val) + '</textarea>';
    } else if (f.type === 'select') {
      input = '<select name="' + f.name + '"' + req + '>' + f.options.map(function (o) {
        var ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o;
        return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>';
      }).join('') + '</select>';
    } else {
      input = '<input name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(val) + '"' +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + req + '>';
    }
    return '<label class="field' + (f.half ? ' half' : '') + '"><span>' + esc(f.label) + '</span>' + input + '</label>';
  }

  // Dialog form generik untuk Create dan Update
  function form(opts) {
    var values = opts.values || {};
    var html = '<form id="crud-form"><div class="field-grid">' +
      opts.fields.map(function (f) { return fieldHtml(f, values[f.name]); }).join('') +
      '</div><div class="dialog-actions"><button type="button" class="btn btn-quiet" data-act="close-modal">Batal</button>' +
      '<button type="submit" class="btn btn-ink">' + esc(opts.submit || 'Simpan') + '</button></div></form>';
    openModal(opts.title, html);
    var f = document.getElementById('crud-form');
    var first = f.querySelector('input,textarea,select');
    if (first) first.focus();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = {};
      new FormData(f).forEach(function (v, k) { out[k] = typeof v === 'string' ? v.trim() : v; });
      if (opts.onSubmit(out) !== false) closeModal();
    });
  }

  function confirmBox(message, onOk, label) {
    openModal('Konfirmasi', '<p class="confirm-text">' + esc(message) + '</p>' +
      '<div class="dialog-actions"><button type="button" class="btn btn-quiet" data-act="close-modal">Batal</button>' +
      '<button type="button" class="btn btn-danger" id="confirm-ok">' + esc(label || 'Hapus') + '</button></div>');
    document.getElementById('confirm-ok').addEventListener('click', function () { closeModal(); onOk(); });
  }

  window.UI = {
    HARI: HARI, esc: esc, fmtDate: fmtDate, daysLeft: daysLeft, dueLabel: dueLabel, initials: initials,
    toast: toast, openModal: openModal, closeModal: closeModal, form: form, confirm: confirmBox
  };
})();
