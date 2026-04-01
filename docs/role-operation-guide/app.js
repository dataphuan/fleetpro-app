const tabs = [...document.querySelectorAll('.tab')];
const rolePanels = [...document.querySelectorAll('.role-panel')];
const quickSearch = document.getElementById('quickSearch');
const btnExpandAll = document.getElementById('btnExpandAll');
const btnPrint = document.getElementById('btnPrint');

function activateRole(role) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.role === role;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  rolePanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.rolePanel === role);
  });

  runSearchFilter();
}

function runSearchFilter() {
  const term = (quickSearch.value || '').trim().toLowerCase();
  const activePanel = rolePanels.find((panel) => panel.classList.contains('is-active'));
  if (!activePanel) return;

  const groups = [...activePanel.querySelectorAll('details')];
  groups.forEach((group) => {
    const text = group.textContent.toLowerCase();
    const show = !term || text.includes(term);
    group.classList.toggle('hidden-by-search', !show);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => activateRole(tab.dataset.role));
});

quickSearch.addEventListener('input', runSearchFilter);

btnExpandAll.addEventListener('click', () => {
  const activePanel = rolePanels.find((panel) => panel.classList.contains('is-active'));
  if (!activePanel) return;

  const details = [...activePanel.querySelectorAll('details')];
  const shouldOpen = details.some((item) => !item.open);
  details.forEach((item) => {
    if (!item.classList.contains('hidden-by-search')) {
      item.open = shouldOpen;
    }
  });

  btnExpandAll.textContent = shouldOpen ? 'Thu gọn danh mục kiểm tra' : 'Mở tất cả danh mục kiểm tra';
});

btnPrint.addEventListener('click', () => window.print());

activateRole('ceo');
