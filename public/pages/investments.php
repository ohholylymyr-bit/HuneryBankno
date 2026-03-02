<?php requireLogin(); renderHeader('Sijoitukset', $config); ?>
<section class="card">
<h2>Reaaliaikaiset markkinat</h2>
<p>10 kryptoa, 20 suomalaista kohdetta ja 50 kansainvälistä osaketta.</p>
<div id="market"></div>
</section>
<script defer src="/assets/js/market.js"></script>
<?php renderFooter(); ?>
