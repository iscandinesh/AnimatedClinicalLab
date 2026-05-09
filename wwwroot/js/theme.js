window.themeInterop = {
    setTheme: function (isDark) {
        if (isDark) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
    }
};
