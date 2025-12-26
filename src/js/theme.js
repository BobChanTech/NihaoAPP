class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // 应用保存的主题
        this.applyTheme(this.currentTheme);
        
        // 监听系统主题变化
        this.watchSystemTheme();
        
        // 绑定切换按钮事件
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTheme());
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        // 更新按钮图标
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    watchSystemTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        
        // 如果没有用户设置的主题，跟随系统
        if (!localStorage.getItem('theme')) {
            this.applyTheme(prefersDark.matches ? 'dark' : 'light');
        }
        
        // 监听系统主题变化
        prefersDark.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

// 初始化主题管理器
const themeManager = new ThemeManager();