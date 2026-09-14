/*[[ A CAMADA DE MOVIMENTO DO SITE INTEIRO, num arquivo so'.

     Ela vive aqui e nao dentro de cada HTML pelo mesmo motivo do estilo.css:
     com duas paginas ja' da' pra esquecer uma quando algo muda, e a terceira
     vai existir.

     Faz TRES coisas. Nao mais que isso, de proposito:

       1. SURGIR AO ROLAR — cada bloco entra com um empurrao de baixo pra cima
          na primeira vez que aparece.
       2. ONDA NO CLIQUE — o circulo que abre de onde o dedo tocou.
       3. RESPEITAR QUEM PEDIU SOSSEGO — se o sistema esta com "reduzir
          animacoes", nada disso liga.

     Sem biblioteca. Sao poucas dezenas de linhas; qualquer pacote pra isso
     pesaria mais que a pagina. ]]*/

(function () {
  'use strict';

  var quietoPorFavor = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------- 1. surgir
  //
  // IntersectionObserver e nao evento de scroll: o navegador AVISA quando o
  // elemento entra na tela, em vez de a gente perguntar sessenta vezes por
  // segundo. A diferenca aparece em celular fraco, que e' o aparelho de boa
  // parte de quem abre isto.
  var blocos = document.querySelectorAll('.surge');

  if (quietoPorFavor || !('IntersectionObserver' in window)) {
    // Sem observador, ou sem vontade de movimento: tudo visivel na hora.
    for (var i = 0; i < blocos.length; i++) blocos[i].classList.add('visivel');
  } else {
    var olho = new IntersectionObserver(function (entradas) {
      for (var k = 0; k < entradas.length; k++) {
        var e = entradas[k];
        if (!e.isIntersecting) continue;
        e.target.classList.add('visivel');
        // Para de observar depois de mostrar: sem isto o bloco pisca de novo
        // toda vez que a pessoa sobe e desce a pagina, e animacao que repete
        // vira tique.
        olho.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    for (var j = 0; j < blocos.length; j++) olho.observe(blocos[j]);

    //[[ CAO DE GUARDA — e este pedaco vale mais que o efeito inteiro.
    //
    //   Os blocos nascem com opacity:0 e quem devolve a visibilidade e' o
    //   observador. Se ele nao disparar, a pagina de vendas fica EM BRANCO.
    //   Nao e' hipotese: aconteceu no painel de preview durante o
    //   desenvolvimento — janela atras de outra, pagina sem pintar,
    //   observador mudo. Um observador novo e limpo tambem nao disparou.
    //
    //   Entao, um segundo e meio depois: se existe bloco DENTRO da tela (pela
    //   geometria, que nunca mente) e nenhum foi revelado, o observador nao
    //   esta funcionando neste navegador ou nesta situacao. Mostra tudo e
    //   desiste do efeito.
    //
    //   Perder a animacao e' um arranhao. Perder a pagina e' perder a venda.
    //
    //   REPETE ate' poder concluir, e isso foi uma correcao: a primeira versao
    //   checava UMA vez, um segundo e meio depois de carregar. Nesse instante
    //   costuma nao haver bloco nenhum dentro da tela — todos ficam abaixo do
    //   heroi — entao ela nao tinha o que concluir, ia embora, e a pagina
    //   seguia invisivel pra sempre. O guarda so' serve se ele esperar ate'
    //   haver o que julgar.
    var tentativas = 0;
    var vigia = setInterval(function () {
      // Funcionou: o observador esta vivo, nao preciso mais olhar.
      if (document.querySelector('.surge.visivel')) { clearInterval(vigia); return; }

      var algumNaTela = false;
      for (var n = 0; n < blocos.length; n++) {
        var r = blocos[n].getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) { algumNaTela = true; break; }
      }

      // Ninguem em vista: a pessoa ainda nao rolou. Continua esperando.
      if (!algumNaTela) {
        // Teto de paciencia: se em um minuto nada entrou na tela, tambem nao
        // ha' motivo pra seguir gastando um timer.
        if (++tentativas > 75) clearInterval(vigia);
        return;
      }

      // Ha' bloco dentro da tela e nenhum foi revelado: o observador nao
      // funciona aqui. Mostra tudo e desiste do efeito.
      clearInterval(vigia);
      olho.disconnect();
      for (var m = 0; m < blocos.length; m++) blocos[m].classList.add('visivel');
      //[[ 800ms, e o numero foi medido.
      //
      //   Quando o observador funciona, ele responde em dezenas de
      //   milissegundos — 800 e' folga de sobra pra nunca atropelar o efeito.
      //   E quando ele NAO funciona, este intervalo vira o tempo que o
      //   visitante passa olhando uma pagina pela metade. A primeira versao
      //   usava 1500ms; medido no navegador de testes, a revelacao caiu entre
      //   1200 e 1700ms. Metade disso e' metade do prejuizo no caso ruim,
      //   sem custo nenhum no caso bom. ]]
    }, 800);
  }

  // --------------------------------------------------------------- 2. onda
  //
  // `pointerdown` e nao `click`: a onda tem que sair no toque, nao quando o
  // dedo levanta. Num link que leva pra fora — o do Discord, o do download —
  // esse meio segundo e' a diferenca entre parecer travado e parecer vivo.
  if (quietoPorFavor) return;

  document.addEventListener('pointerdown', function (ev) {
    if (!ev.target || !ev.target.closest) return;
    var alvo = ev.target.closest('.btn, a.produto, details > summary');
    if (!alvo) return;

    var caixa = alvo.getBoundingClientRect();
    var tamanho = Math.max(caixa.width, caixa.height) * 2;

    var onda = document.createElement('span');
    onda.className = 'onda';
    onda.style.width = tamanho + 'px';
    onda.style.height = tamanho + 'px';
    onda.style.left = (ev.clientX - caixa.left - tamanho / 2) + 'px';
    onda.style.top = (ev.clientY - caixa.top - tamanho / 2) + 'px';

    alvo.appendChild(onda);

    // Limpeza pelo fim da animacao, com um prazo de seguranca por tras: se a
    // aba estiver em segundo plano o `animationend` pode nunca chegar, e ai'
    // as ondas iriam se acumulando no DOM.
    var sumir = function () { if (onda.parentNode) onda.parentNode.removeChild(onda); };
    onda.addEventListener('animationend', sumir);
    setTimeout(sumir, 900);
  });
})();
