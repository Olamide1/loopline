<template>
  <div class="home">
    <header class="home-header">
      <div class="container">
        <nav class="nav">
          <div class="nav-brand">Loopline</div>
          <div class="nav-actions">
            <router-link to="/login" class="btn btn-secondary">Login</router-link>
            <router-link to="/signup" class="btn btn-accent">Get Started</router-link>
          </div>
        </nav>
      </div>
    </header>

    <main class="home-main">
      <section class="hero">
        <div class="container">
          <div class="grid">
            <div class="grid-item-8" style="margin: 0 auto;">
              <div class="hero-content cutout cutout-accent-1 bauhaus-circle bauhaus-primary-stripe">
                <h1 class="heading-1">Team chat that doesn't trap your files</h1>
                <p class="hero-text">
                  Stop paying per person. Stop losing files when you switch tools. 
                  Chat with your team, keep everything in your Drive, and leave whenever you want.
                </p>
                <div class="hero-actions">
                  <router-link to="/signup" class="btn">Start Free</router-link>
                  <router-link to="/login" class="btn btn-secondary">Login</router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="features">
        <div class="container">
          <div class="grid">
            <div class="grid-item-4">
              <div class="feature-card card cutout cutout-accent-2 bauhaus-rect card-bauhaus-blue">
                <div class="feature-icon">📁</div>
                <h3 class="heading-3">Switch Tools Anytime</h3>
                <p class="text-muted">
                  Your files live in your Google Drive, not ours. Leave tomorrow and take everything with you. No export needed.
                </p>
              </div>
            </div>
            <div class="grid-item-4">
              <div class="feature-card card cutout cutout-accent-3 bauhaus-triangle card-bauhaus-yellow">
                <div class="feature-icon">💰</div>
                <h3 class="heading-3">Budget Without Surprises</h3>
                <p class="text-muted">
                  One price per workspace, no matter how many people join. Add 5 or 50—your bill stays the same.
                </p>
              </div>
            </div>
            <div class="grid-item-4">
              <div class="feature-card card cutout cutout-accent-4 cutout-organic card-bauhaus-red">
                <div class="feature-icon">🔌</div>
                <h3 class="heading-3">One Place for Everything</h3>
                <p class="text-muted">
                  Stripe payments, GitHub commits, deploy alerts—all in channels, not buried in email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="pricing">
        <div class="container">
          <h2 class="heading-2" style="text-align: center; margin-bottom: var(--space-6);">Simple Pricing</h2>
          <div class="pricing-grid">
            <div class="pricing-card card">
              <div style="text-align: center;">
                <h3 class="heading-3" style="margin-bottom: var(--space-2);">Hosted</h3>
                <div class="pricing-amount">
                  <span class="pricing-currency">$</span>
                  <span class="pricing-number">15</span>
                  <span class="pricing-period">/month</span>
                </div>
                <p class="text-muted" style="margin-top: var(--space-3); margin-bottom: var(--space-5);">
                  Per workspace. Unlimited members, channels, and messages. Cancel anytime.
                </p>
                <p class="text-muted" style="font-size: var(--text-sm); margin-top: var(--space-2);">
                  That's $3/person for a 5-person team. Compare to $6.67/person on Slack.
                </p>
                <ul class="pricing-features">
                  <li>Unlimited team members</li>
                  <li>Unlimited channels</li>
                  <li>Unlimited messages</li>
                  <li>Google Drive integration</li>
                  <li>Webhook integrations</li>
                  <li>Message search</li>
                  <li>File storage in your Drive</li>
                </ul>
                <div style="margin-top: var(--space-6);">
                  <router-link to="/signup" class="btn" style="width: 100%;">Get Started</router-link>
                </div>
              </div>
            </div>
            <div class="pricing-card card">
              <div style="text-align: center;">
                <h3 class="heading-3" style="margin-bottom: var(--space-2);">Self-Hosted</h3>
                <div class="pricing-amount">
                  <span class="pricing-currency">Free</span>
                </div>
                <p class="text-muted" style="margin-top: var(--space-3); margin-bottom: var(--space-5);">
                  Run it yourself. Docker Compose included.
                </p>
                <ul class="pricing-features">
                  <li>Full source code access</li>
                  <li>Complete data control</li>
                  <li>All hosted features</li>
                  <li>Docker setup included</li>
                  <li>Optional paid support</li>
                  <li>Optional paid updates</li>
                  <li>Your infrastructure</li>
                </ul>
                <div style="margin-top: var(--space-6);">
                  <a href="#" class="btn btn-secondary" style="width: 100%;">Learn More</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="cta">
        <div class="container">
          <div class="grid">
            <div class="grid-item-8" style="margin: 0 auto;">
              <div class="cta-card card cutout cutout-accent-1 bauhaus-circle">
                <h2 class="heading-2">$15/month for your whole team. No per-seat nonsense.</h2>
                <p class="text-muted" style="margin-top: var(--space-3);">
                  Built for indie teams, agencies, and small engineering groups who want simple chat without the lock-in. 
                  Try it free, no credit card needed.
                </p>
                <div style="margin-top: var(--space-5);">
                  <router-link to="/signup" class="btn btn-accent">Get Started Free</router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="home-footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">Loopline</div>
          <div class="footer-links">
            <a href="#" class="footer-link">Self-Hosted</a>
            <a href="#" class="footer-link">Pricing</a>
            <a href="#" class="footer-link">Support</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
// Landing page
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.home-header {
  padding: var(--space-5) 0;
  border-bottom: 4px solid var(--bauhaus-black);
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.home-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: var(--bauhaus-red);
  z-index: 1;
}

/* Remove bauhaus-line from header to prevent alignment issues */
.home-header.bauhaus-line::before {
  display: none;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-size: var(--text-xl);
  font-weight: 900;
  color: var(--bauhaus-black);
  text-transform: uppercase;
  letter-spacing: 2px;
  position: relative;
}

.nav-brand::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--bauhaus-yellow);
  z-index: 1;
}

.nav-actions {
  display: flex;
  gap: var(--space-3);
}

.home-main {
  flex: 1;
}

.hero {
  padding: var(--space-8) 0;
  background: var(--color-bg-alt);
  position: relative;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(
    to right,
    var(--bauhaus-red) 0%,
    var(--bauhaus-red) 33%,
    var(--bauhaus-yellow) 33%,
    var(--bauhaus-yellow) 66%,
    var(--bauhaus-blue) 66%,
    var(--bauhaus-blue) 100%
  );
  z-index: 0;
}

.hero-content {
  text-align: center;
  padding: var(--space-7);
  position: relative;
  z-index: 1;
}

.hero-text {
  font-size: var(--text-lg);
  color: var(--color-text-muted);
  margin-top: var(--space-4);
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  margin-top: var(--space-6);
}

.features {
  padding: var(--space-8) 0;
}

.pricing {
  padding: var(--space-8) 0;
  background: var(--color-bg-alt);
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-5);
  max-width: 900px;
  margin: 0 auto;
}

.pricing-card {
  height: 100%;
}

.pricing-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-1);
  margin: var(--space-4) 0;
}

.pricing-currency {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text);
}

.pricing-number {
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.pricing-period {
  font-size: var(--text-lg);
  color: var(--color-text-muted);
  font-weight: 500;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.pricing-features li {
  padding: var(--space-2) 0;
  color: var(--color-text);
  position: relative;
  padding-left: var(--space-5);
}

.pricing-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--matisse-green);
  font-weight: 700;
}

.feature-card {
  padding: var(--space-5);
  text-align: center;
  position: relative;
  z-index: 1;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}

.feature-card h3 {
  margin-bottom: var(--space-3);
}

.cta {
  padding: var(--space-8) 0;
  background: var(--color-bg-alt);
}

.cta-card {
  text-align: center;
  padding: var(--space-7);
  position: relative;
  z-index: 1;
}

.home-footer {
  padding: var(--space-6) 0;
  border-top: 3px solid var(--color-text);
  background: var(--color-bg);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-brand {
  font-weight: 600;
  color: var(--color-primary);
}

.footer-links {
  display: flex;
  gap: var(--space-5);
}

.footer-link {
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer-link:hover {
  color: var(--color-primary);
}

/* Mobile */
@media (max-width: 768px) {
  .hero {
    padding: var(--space-6) 0;
  }
  
  .hero-content {
    padding: var(--space-5);
  }
  
  .hero-actions {
    flex-direction: column;
  }
  
  .hero-actions .btn {
    width: 100%;
  }
  
  .features {
    padding: var(--space-6) 0;
  }
  
  .feature-card {
    margin-bottom: var(--space-4);
  }
  
  .pricing {
    padding: var(--space-6) 0;
  }
  
  .pricing-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .pricing-card {
    margin-bottom: var(--space-4);
  }
  
  .cta {
    padding: var(--space-6) 0;
  }
  
  .cta-card {
    padding: var(--space-5);
  }
  
  .footer-content {
    flex-direction: column;
    gap: var(--space-4);
    text-align: center;
  }
  
  .footer-links {
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .nav-actions {
    gap: var(--space-2);
  }
  
  .nav-actions .btn {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
  }
}
</style>

