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
