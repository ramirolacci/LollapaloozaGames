class AlertManager {
    static container = document.getElementById('alert-container');

    static show({ title, message, buttonText, type = 'win', callback }) {
        this.container.innerHTML = ''; // Clear previous

        const overlay = document.createElement('div');
        overlay.id = 'alert-overlay';

        const alertBox = document.createElement('div');
        alertBox.className = `modern-alert ${type}`;

        alertBox.innerHTML = `
            <h2>${title}</h2>
            <p>${message}</p>
            <button class="btn-modern">${buttonText}</button>
            <button class="btn-modern menu-btn">MENÚ</button>
        `;

        this.container.appendChild(overlay);
        this.container.appendChild(alertBox);

        const btn = alertBox.querySelector('.btn-modern');
        btn.onclick = () => {
            this.hide(overlay, alertBox, callback);
        };

        const menuBtn = alertBox.querySelector('.menu-btn');
        if (menuBtn) {
            menuBtn.onclick = () => {
                location.href = '../../index.html';
            };
        }

        // GSAP Animations
        gsap.to(overlay, {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out"
        });

        gsap.to(alertBox, {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: "back.out(1.7)"
        });

        // Add a subtle bounce loop to the button
        gsap.to(btn, {
            scale: 1.05,
            duration: 0.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }

    static hide(overlay, alertBox, callback) {
        gsap.to(alertBox, {
            scale: 0.8,
            opacity: 0,
            duration: 0.3,
            ease: "power2.in"
        });

        gsap.to(overlay, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => {
                this.container.innerHTML = '';
                if (callback) callback();
            }
        });
    }
}
