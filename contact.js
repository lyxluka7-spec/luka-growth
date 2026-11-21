document.querySelectorAll('[data-copy-wechat]').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('Luka0255');
      button.textContent = '已复制：Luka0255';
    } catch {
      button.textContent = '请长按复制微信号：Luka0255';
    }
  });
});

// Keep the mobile contact entry out of the way while typing or at the contact panel.
const updateContactFocus = () => {
  const el = document.activeElement;
  document.body.classList.toggle('editing-field', !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};
document.addEventListener('focusin', updateContactFocus);
document.addEventListener('focusout', () => setTimeout(updateContactFocus, 0));
const contactPanel = document.getElementById('contact');
if (contactPanel && 'IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    document.body.classList.toggle('contact-in-view', entries.some(entry => entry.isIntersecting));
  }, {threshold:0}).observe(contactPanel);
}
