// ==UserScript==
// @name         Sipulse Omnipresente
// @namespace    http://tampermonkey.net/
// @version      4.7.1
// @description  Ativação via ALT + Q. Fundo Global Forçado (CSS)
// @author       Samuelluiz280
// @match        *://*/*
// @grant        window.focus
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_setClipboard
// @updateURL    
// @downloadURL  
// ==/UserScript==

(function() {
    'use strict';

    if (window.top !== window.self) return;

    const isSipulseTab = window.location.href.includes("hpbx01.brasiltecpar.com.br");
    const LINK_IMAGEM_FUNDO = "https://static.wixstatic.com/media/300e5a_95808568788d49c6a0e1a90a4dcfebf8~mv2.png/v1/fill/w_1851,h_900,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/300e5a_95808568788d49c6a0e1a90a4dcfebf8~mv2.png";

    // 🧹 Função para apagar o que estiver escrito no campo antes de digitar o código
    function limparInputTelefone() {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([id*="omni"])'));
        const input = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('n')) || inputs[0];

        if (input) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(input, '');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // 🤖 Função que clica fisicamente nos botões do painel lateral do usuário
    async function executarComandoTecladoVirtual(sequencia, clicaLigarNoFinal) {
        limparInputTelefone();
        await new Promise(resolve => setTimeout(resolve, 150));

        let botoesDoPainel = Array.from(document.querySelectorAll('button.button-pad'));

        if (botoesDoPainel.length === 0) {
            botoesDoPainel = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim().length === 1);
        }

        for (let char of sequencia) {
            const btn = botoesDoPainel.find(b => b.innerText.trim() === char);
            if (btn) {
                btn.click();
                await new Promise(resolve => setTimeout(resolve, 120));
            }
        }

        if (clicaLigarNoFinal) {
            await new Promise(resolve => setTimeout(resolve, 200));
            const btnCall = document.querySelector('button.btn-call') || Array.from(document.querySelectorAll('mat-icon')).find(i => i.innerText.trim() === 'call')?.closest('button');
            if (btnCall) btnCall.click();
        }
    }

    // 🔒 Função para forçar o Auto Atendimento e ocultá-lo (Angular Material / DOM)
    function enforcarAutoAtendimento() {
        // --- A TRAVA DE SEGURANÇA (BYPASS) ---
        // Se o bypass estiver ativado, a função restaura a visibilidade e morre aqui
        if (GM_getValue('omni_bypass_auto_atendimento', false)) {
            const todosElementos = document.querySelectorAll('mat-checkbox, label');
            todosElementos.forEach(el => {
                if (el.innerText && el.innerText.toLowerCase().includes('auto atendimento')) {
                    el.style.display = ''; // Devolve a visibilidade
                }
            });
            return;
        }
        // -------------------------------------

        const matCheckboxes = document.querySelectorAll('mat-checkbox, .mat-checkbox, .mat-mdc-checkbox');

        matCheckboxes.forEach(checkbox => {
            if (checkbox.innerText && checkbox.innerText.toLowerCase().includes('auto atendimento')) {
                const input = checkbox.querySelector('input[type="checkbox"]');

                const isChecked =
                    checkbox.classList.contains('mat-checkbox-checked') ||
                    checkbox.classList.contains('mat-mdc-checkbox-checked') ||
                    (input && input.checked) ||
                    (input && input.getAttribute('aria-checked') === 'true');

                if (!isChecked) {
                    const label = checkbox.querySelector('label');
                    if (label) {
                        label.click();
                    } else if (input) {
                        input.click();
                    } else {
                        checkbox.click();
                    }
                }

                if (checkbox.style.display !== 'none') {
                    checkbox.style.display = 'none';
                }
            }
        });

        const labels = document.querySelectorAll('label');
        labels.forEach(label => {
            if (label.innerText && label.innerText.toLowerCase().includes('auto atendimento')) {
                const input = label.querySelector('input[type="checkbox"]') || document.getElementById(label.getAttribute('for'));
                if (input && input.type === 'checkbox') {
                    if (!input.checked) {
                        input.click();
                    }
                    if (label.style.display !== 'none') {
                        label.style.display = 'none';
                    }
                }
            }
        });
    }

    // =========================================================
    // 🧠 1. MOTOR DE FUNDO (SÓ RODA NA ABA DO SIPULSE)
    // =========================================================
    if (isSipulseTab) {

        // --- APLICA A IMAGEM DE FUNDO GLOBAL NO SIPULSE (VIA CSS FORÇADO) ---
        // Isso impede que o Angular sobreescreva a nossa imagem de fundo
        const estiloFundo = document.createElement('style');
        estiloFundo.innerHTML = `
            body, html, app-root, .mat-app-background, .mat-drawer-container, mat-sidenav-container {
                background-image: linear-gradient(rgba(4, 15, 30, 0.85), rgba(4, 15, 30, 0.85)), url('${LINK_IMAGEM_FUNDO}') !important;
                background-size: cover !important;
                background-attachment: fixed !important;
                background-position: center !important;
                background-color: transparent !important;
            }
            /* Garante que os painéis principais do Angular fiquem transparentes para mostrar o fundo */
            .mat-drawer-content {
                background-color: transparent !important;
            }
        `;
        document.head.appendChild(estiloFundo);
        // --------------------------------------------------------------------

        if (Notification.permission !== "granted" && Notification.permission !== "denied") { Notification.requestPermission(); }
        let notificacaoJaDisparada = false;

        // 🛡️ Garante que a opção de Auto Atendimento fique marcada e invisível
        setInterval(enforcarAutoAtendimento, 1000);

        setInterval(() => {
            const textoDaTela = document.body.innerText;

            const matchRamal = textoDaTela.match(/Ramal:\s*(\d+)/i);
            if(matchRamal) { GM_setValue('omni_ramal', matchRamal[1]); }

            const matchProtocolo = textoDaTela.match(/N\.?\s*Atendimento:\s*(\d+)/i);
            const protocoloEncontrado = matchProtocolo ? matchProtocolo[1] : '';

            const btnEncerrarNaTela = Array.from(document.querySelectorAll('mat-icon')).find(i => i.innerText.trim() === 'call_end');
            const estadoAtual = GM_getValue('omni_estado_chamada', { status: 'livre', numero: '', inicio: 0, protocolo: '', copiado: false });

            let novoStatus = estadoAtual.status;
            let novoNumero = estadoAtual.numero;
            let novoInicio = estadoAtual.inicio;
            let novoProtocolo = estadoAtual.protocolo;
            let novoCopiado = estadoAtual.copiado;
            let houveMudanca = false;

            if (textoDaTela.includes("Recebendo chamada de")) {
                const matchNome = textoDaTela.match(/Recebendo chamada de\s+([^\n]+)/);
                const caller = matchNome ? matchNome[1] : "Desconhecido";

                if (estadoAtual.status !== 'tocando') {
                    novoStatus = 'tocando'; novoNumero = caller; novoInicio = 0; novoProtocolo = protocoloEncontrado; novoCopiado = false; houveMudanca = true;

                    if (Notification.permission === "granted" && !notificacaoJaDisparada) {
                        notificacaoJaDisparada = true;
                        const notif = new Notification("⚠️ LIGAÇÃO ENTRANDO!", { body: "Abra a interface (ALT+Q) para atender.", requireInteraction: true });
                        notif.onclick = function() {
                            const btn = document.querySelector('button#call'); if (btn) btn.click(); this.close();
                        };
                        setTimeout(() => { notificacaoJaDisparada = false; }, 10000);
                    }
                } else if (protocoloEncontrado && protocoloEncontrado !== novoProtocolo) {
                    novoProtocolo = protocoloEncontrado; houveMudanca = true;
                }
            }
            else if (btnEncerrarNaTela) {
                if (estadoAtual.status !== 'ativa') {
                    novoStatus = 'ativa'; novoNumero = estadoAtual.numero || "Em Andamento"; novoInicio = Date.now(); novoCopiado = false; houveMudanca = true;
                }
                if (protocoloEncontrado && protocoloEncontrado !== novoProtocolo) {
                    novoProtocolo = protocoloEncontrado; houveMudanca = true;
                }
                if (novoStatus === 'ativa' && novoProtocolo && !novoCopiado) {
                    GM_setClipboard(novoProtocolo);
                    novoCopiado = true;
                    houveMudanca = true;
                }
            }
            else {
                if (estadoAtual.status !== 'livre') {
                    novoStatus = 'livre'; novoNumero = ''; novoInicio = 0; novoProtocolo = ''; novoCopiado = false; houveMudanca = true;
                    GM_setValue('omni_estado_mute', { mutado: false, ts: Date.now() });
                }
            }

            if (houveMudanca) {
                GM_setValue('omni_estado_chamada', { status: novoStatus, numero: novoNumero, inicio: novoInicio, protocolo: novoProtocolo, copiado: novoCopiado });
            }

        }, 1000);

        GM_addValueChangeListener('omni_comando', (nome, antigo, novo) => {
            if (novo.acao === 'atender') {
                const btnAtender = document.querySelector('button#call'); if (btnAtender) { btnAtender.click(); }
            }
            else if (novo.acao === 'ligar') {
                executarComandoTecladoVirtual(novo.numero, true);
            }
            else if (novo.acao === 'transferir') {
                executarComandoTecladoVirtual('*2' + novo.numero + '#', true);
            }
            else if (novo.acao === 'pesquisa_satisfacao') {
                executarComandoTecladoVirtual('*3101090#', false);
            }
            else if (novo.acao === 'desligar_manual') {
                const icons = Array.from(document.querySelectorAll('mat-icon'));
                const endIcon = icons.find(i => i.innerText.trim() === 'call_end');
                if (endIcon && endIcon.closest('button')) { endIcon.closest('button').click(); }
            }
            else if (novo.acao === 'mutar') {
                const icons = Array.from(document.querySelectorAll('mat-icon'));
                const micIcon = icons.find(i => i.innerText.trim() === 'mic' || i.innerText.trim() === 'mic_off');
                if (micIcon && micIcon.closest('button')) { micIcon.closest('button').click(); }
            }
        });
    }

    // =========================================================
    // 🎨 2. CONSTRUTOR DA INTERFACE VISUAL (SOB DEMANDA)
    // =========================================================
    let interfaceInjetada = false;

    function injetarInterface() {
        if (interfaceInjetada) return;
        interfaceInjetada = true;

        const DADOS_BRUTOS = [
            ["FILA CSA-GGNET","Fila","101000"],["FILA COMERCIAL-CAÇADOR","Fila","102000"],["FILA COMERCIAL-RIO-DO-SUL","Fila","192000"],["FILA COMERCIAL-SÃO-MATEUS-DO-SUL","Fila","322000"],["FILA COMERCIAL-SANTA-CECILIA","Fila","332000"],["FILA CSA-GEGNET-N2","Fila","101099"],["FILA COMERCIAL-PAPANDUVA","Fila","212000"],["FILA ALT-CTV-COMERCIAL","Fila","422000"],["FILA ALT-JCA-COMERCIAL","Fila","302000"],["FILA ENGENHARIA","Fila","101300"],["FILA VOC","Fila","101200"],["FILA COMERCIAL-ITUPORANGA","Fila","232000"],["FILA LOGÍSTICA-CAÇADOR","Fila","105200"],["FILA COMERCIAL-IRINEOPOLIS","Fila","202000"],["FILA ALT-CDR-NOC","Fila","101100"],["FILA ALT-CDR-MONITORAMENTO","Fila","107400"],["FILA ALT-CTA-COMERCIAL","Fila","372000"],["FILA ALT-SAO-BENTO-DO-SUL","Fila","532000"],["FILA COMERCIAL-CANOINHAS","Fila","262000"],["FILA COMERCIAL-ITAIOPOLIS","Fila","272000"],["FILA ESTOQUE-CAÇADOR","Fila","104400"],["FILA COMERCIAL-UNIÃO-DA-VITÓRIA","Fila","342000"],["FILA ALT-CTA-OUVIDORIA","Fila","376300"],["FILA COMERCIAL-FRAIBURGO","Fila","352100"],["FILA LOGÍSTICA-CAÇADOR 2","Fila","105210"],["FILA ALT-MFA-COMERCIAL","Fila","282000"],["FILA ALT-NOC-SUPERVISAO","Fila","101199"],["FILA ALT-RIN-COMERCIAL","Fila","522000"],["FILA ALT-RON-COMERCIAL","Fila","572000"],["FILA SAC-NEGOCIACAO","Fila","103498"],["FILA COMERCIAL-IBIRAMA","Fila","382000"],["FILA COMERCIAL-TANGARÁ","Fila","352200"],["FILA COMERCIAL-CURITIBANOS","Fila","492000"],["FILA LOGÍSTICA-VIDEIRA","Fila","355200"],["FILA COMERCIAL-VIDEIRA","Fila","352000"],["FILA COMERCIAL-PRESIDENTE-GETULIO","Fila","392000"],["FILA COMERCIAL-TRÊS-BARRAS","Fila","402000"],["FILA GGNET-SAC-RETENÇÃO","Fila","103400"],["FILA COMERCIAL-PINHEIRO-PRETO","Fila","352300"],["FILA TI-GGNET","Fila","101400"],["FILA LOGISTICA-ITAPOA","Fila","605200"],["FILA ITEL-COMERCIAL","Fila","602000"],["FILA CANCELAMENTO-GGNET","Fila","104500"],["FILA COMERCIAL-IRATI","Fila","802000"],["FILA ALT-0800-COMERCIAL","Fila","378000"],["FILA ALT-ADU-MDT-PYE-QND","Fila","502000"],["FILA ALT-CCO-COMERCIAL","Fila","162000"],["FILA COMERCIAL-SALTO-VELOSO","Fila","142000"],["FILA GGNET-SAC-FINANCEIRO","Fila","101900"],
            ["LUANA APARECIDA GOMES","ADM Financeiro","104012"],["FABIANA BATISTA","ADM Financeiro","104013"],["ANDRESSA DA SILVA BAHLS","ADM Financeiro","104016"],["ALINE MORAES TROCZNSKI","ADM Financeiro","104018"],["DAIANE ROSSETTO","ADM Financeiro","104019"],["VIVIANE TAIS FARIAS","ADM Financeiro","104022"],["RAFAEL ANTONIO DA SILVA","ADM Financeiro","104023"],["VALDIRENE HEBERLE","ADM Financeiro","104024"],["LUCIANA DAS GRACAS","ADM Financeiro","104027"],["ANA JULIA POSTELNIK","ADM Financeiro","104028"],["FERNANDA APARECIDA","ADM Financeiro","104029"],["GRASIELE LEISMANN","ADM Financeiro","104030"],["TALITA GRASIELE PACHECO","ADM Financeiro","104034"],["SUSANA GOMES DE ALMEIDA","ADM Financeiro","104035"],["YASMIN CRISTINA FERREIRA","ADM Financeiro","104040"],["CLAUDIA WAGNER DE LIMA","ADM Financeiro","184010"],["IVANIA SALETE KLEEMANN","ADM Financeiro","184011"],["JULIA EMMANUELLE LOTTI","ADM Financeiro","184015"],["ANALICE SIQUEIRA KRAUSE","ADM Financeiro","184026"],["ANDRESSA DA SILVA LINDNER","ADM Financeiro","184027"],["GABRIELE BAI DIDEK","ADM Financeiro","609010"],["TAINA NATALI VALCARENGHI","Administrativo","107012"],["ALINE APARECIDA RODRIGUES","Administrativo","107014"],["ANTONELA ALVES","Administrativo","107018"],["LOUISE DE SOUZA ALBIGAUS","Administrativo","107019"],["BRUNA DE BARROS FURTADO","Administrativo","107020"],["CRISTIANE APARECIDA BUSATTO","Administrativo","162010"],["JENIFER PISTOR","Administrativo","162011"],["THAIS EDUARDA HEFNNER","Administrativo","162022"],["ALINE BOTH PERTUZATTI","Administrativo","164010"],["RODRIGO GABRIEL BARATA","Administrativo","164012"],["SABRINA ORSO","Administrativo","164014"],["TANARA APARECIDA BELLEI","Administrativo","164016"],["JULIANA CAROLINA MACHADO","Administrativo","164019"],["MARIVANE SERPA GUARAGNI","Administrativo","164021"],["BIANCA SCHUSTER PORTELA","Administrativo","164022"],["ELIANE DE FANTE","Administrativo","167020"],["GIULIA MATOS FERNANDES","Administrativo","167021"],["ANDRESSA MARCHIORO","Administrativo","167022"],["BIANCA DE OLIVEIRA","Administrativo","177016"],["ANALICE THEISEN BARCELOS","Administrativo","177018"],["ANDREZA PEREIRA DE LORENA","Administrativo","287011"],["SUELEN DO PRADO","Administrativo","287012"],["EVELIN TALIA BANDEIRA","Administrativo","371934"],["PAOLA CRISTINA SANTOS","Administrativo","373410"],["DANIEL CRISTIAN DA SILVA","Administrativo","373411"],["ADAO DOMINGOS DE SOUZA","Administrativo","377010"],["BRUNA SELLA BLASKOWSKI","Administrativo","377012"],["TATIANE POMPERMAIER","Administrativo","377016"],["JANE IARA PEDROSO","Administrativo","422010"],["SUSIANE APARECIDA VIEIRA","Administrativo","804016"],["BIANCA CIBELE BALBINOT","Administrativo","164023"],["PATRICIA MACHADO","Almoxarifado","104410"],["VANESA GABRIELA VERONESE","Almoxarifado","104412"],["ADILSON FAUSTINO DOS SANTOS","Almoxarifado","104413"],["ANA PAULA PAIM PADILHA","Almoxarifado","104418"],["DOUGLAS CAMPOS PAULINO","Almoxarifado","164412"],["MATHEUS HENRIQUE KOPSELL","Almoxarifado","164413"],["ALDORI NASATO","Almoxarifado","194410"],["CRISTIAN THOMAZ ALBRECHT","Almoxarifado","284420"],["MILLENNE MARIA DE FREITAS","Almoxarifado","354410"],["ANDERSON FISCHER DA SILVA","Almoxarifado","504420"],["REINALDO OSSOSKI","Almoxarifado","504433"],["LUIZ ANTONIO CASTILHO","Callback","101344"],["DIOGO GARCIA VAZ","Callback","105411"],["GUILHERME FELIPE WOLFF","Callback","105412"],["ALDACIR URUPUCKNA FILHO","Callback","105413"],["CLEITON REICHARDT","Callback","105414"],["GUILHERME SCHWEITZER","Callback","355410"],["GILBERT NICOLAS DAMASCENO","Callback","355415"],["PAULO ROBERTO LUGUES","Callback","371310"],["MATHEUS MARTINS SOARES","Callback","545010"],["BEATRIZ APARECIDA LIMA","Callback","605010"],["RENAN PABLO DO ROSARIO","CGR","102411"],["ALEFE FERNANDO RAMOS","CGR","102412"],["GIOVANI PIMENTEL DE CÓRDOVA","CGR","102418"],["ESCSP","CGR","102423"],["JOAO MIGUEL HILDEBRANDO","CGR","102424"],["HENRIQUE CRISTOVAO CAMARGO","CGR","102426"],["VITOR DELUQUE DE OLIVEIRA","CGR","351112"],["BRED MICHAEL DA ROSA ADAMI","CGR","351113"],["BRUNO PUSTELNIK","Comercial","102012"],["FABIANI MENDES ABRAO","Comercial","102013"],["EDE CARLOS VIEIRA","Comercial","102016"],["ELESSANDRO GUSTAVO DREHMER","Comercial","102017"],["ANDRESSA BATISTA","Comercial","102022"],["ROSANGELA APARECIDA","Comercial","102023"],["MARCOS AURELIO","Comercial","102025"],["BRENDA XAVIER DOS SANTOS","Comercial","102026"],["MARCIA SCHUSTER","Comercial","102036"],["VANESSA DOS SANTOS ALVES","Comercial","132011"],["GABRIELA MOREIRA MISTURINI","Comercial","142010"],["JESSICA GALVAO","Comercial","152015"],["LETICIA GRAFITI","Comercial","162012"],["FERNANDO FRANCISCO PINHO","Comercial","162013"],["CASSIANO BENTO DA SILVA","Comercial","162015"],["GABRIEL FERNANDO DA SILVA","Comercial","162023"],["WANESSA PEREIRA AMARANTE","Comercial","192012"],["ALAN MIGUEL VARELA","Comercial","192014"],["SUELEN DA CUNHA","Comercial","192015"],["ANA CAROLINE DA ROCHA","Comercial","202015"],["NOELE BEATRIZ PIRES SZALEK","Comercial","212011"],["LUANA FRANCINE DE ALMEIDA","Comercial","232011"],["DEBORA SCHIKORSKI","Comercial","242010"],["SCHEILA LUISA DOS SANTOS","Comercial","262010"],["ANTONIO EDSON SOARES","Comercial","262010"],["MILENA ALVES DE LIMA","Comercial","262013"],["GUILHERME RAFAEL WENDT","Comercial","262015"],["MARAJOARA D OLIVEIRA","Comercial","262018"],["JESSICA ALVES DE MIRANDA","Comercial","272011"],["VIVIANE ANIE DOS SANTOS","Comercial","282010"],["MARILUCE FONSECA SILVA","Comercial","282016"],["JESSICA GRACIELE DE ASSUMPÇÃO","Comercial","282017"],["BRUNA FERNANDES","Comercial","292011"],["KALYNE NAYARA SIMON","Comercial","302010"],["DALVAN CAMILO DE BORTOLI","Comercial","302012"],["MARCIELI IONE DROBINHESKI","Comercial","322010"],["GABRIEL MADZGALA SANTA ANA","Comercial","322011"],["JULIANE CASTILHO STANSKI","Comercial","322012"],["JEAN SOUZA PEREIRA","Comercial","332011"],["CAMILA VIEIRA SANTOS","Comercial","342011"],["RONALDO JOSE DAS CHAGAS","Comercial","342012"],["SANDRA CHOJNACKI RUCKL","Comercial","342013"],["NEIDE DAIANE JOBINS","Comercial","342014"],["MARIANA CRISTINA MUDREK","Comercial","342016"],["ITALO JHUAN CALISTRO","Comercial","342017"],["LARISSA PEDROSO","Comercial","352010"],["DAIANE APARECIDA SARMENTO","Comercial","352014"],["ANA PAULA PAZ MAURICIO","Comercial","352015"],["GABRIELA CAROLINE PEPPES","Comercial","352024"],["SUELEN CRISTINA MENDES","Comercial","362011"],["JESSICA DOS SANTOS PADILHA","Comercial","362012"],["JULIA DE OLIVEIRA","Comercial","372010"],["JONAS PEREIRA DA SILVA","Comercial","372012"],["JENIFFER COUTINHO DOS SANTOS","Comercial","372015"],["MARCOS ROBERTO DOS SANTOS","Comercial","372020"],["CHRISTIANE PEREIRA DA SILVA","Comercial","373412"],["MARIA CAROLINA ROSA","Comercial","382010"],["TALYTA CAROLYNE FILOCREAO","Comercial","392010"],["ANA CAROLINA DE LIMA","Comercial","402010"],["MILENE EDUARDA DANNEMANN","Comercial","432010"],["BIANCA ALVES RIBEIRO","Comercial","442011"],["RAISSA CRISTINA OLIVEIRA","Comercial","442012"],["LAIS KARLA RODRIGUES","Comercial","462010"],["GRAZIELE MOCELIN","Comercial","482010"],["NAIARA APARECIDA PORTELLA","Comercial","492013"],["JULIA DA CRUZ GONCALVES","Comercial","502011"],["PEDRO LEONARDO GOGOLA","Comercial","502012"],["MARIA ALICE SURA","Comercial","502016"],["TATIANE OSSOSKI MARTINS","Comercial","502018"],["CRISTHY ELLYN MOLETTA","Comercial","502019"],["JULIANA TAIMARA DA CRUZ","Comercial","502021"],["LEILIANE MARTINS","Comercial","522018"],["NATALI RUDNICK ADRIANO","Comercial","522019"],["JULIA APARECIDA DORNELES","Comercial","532025"],["ANTONIO DAVI VAZ LIMA","Comercial","542010"],["CLAUDIA VILA","Comercial","572010"],["ALANA SILVEIRA SANTOS","Comercial","572014"],["SUZANE REGINA ALVES","Comercial","602013"],["GISSELLE BUENO","Comercial","602015"],["THASSILA THAISSA DE JESUS","Comercial","602016"],["NARAYENE DIUNISIO ALEXANDRE","Comercial","602054"],["JACKSON KRUGER","Comercial","602055"],["RUBIANE THEURER SEBERINO","Comercial","604010"],["ANA LUIZA BASTOS","Comercial","607010"],["YASMIN GABRIELA FELDHAUS","Comercial","609011"],["TULIO PEREK","Comercial","802014"],["TALITA DE FREITAS","Comercial","802016"],["TATIANA CRISTINA LIMA","Comercial","802018"],["LEANDRO DENKEWICZ","Comercial","802020"],["SILVIA APARECIDA OLEINIK","Compras","104416"],["MARINDIA FORTES","Compras","174311"],["EDEMIR MATEUS DE AZEVEDO","Compras","184356"],["POLLIANNA RAFAELA DA SILVA","Contabilidade","104221"],["TAIS ZIMMERMANN","Contabilidade","104236"],["SAMANTHA NICHELE","Contabilidade","184230"],["JOSE ADAO FUCK NETO","Coordenação Com.","282013"],["MARCIO MARCELINO DE GODOI","Coordenação Com.","492011"],["JOAO PAULO STEFANES","Coordenação CS","101810"],["RICARDO MURILLO SILVEIRA","Coord. Operacional","178413"],["BRUNO BUCHHOLZ","Coord. Operacional","193015"],["PAOLA MULLER","Coord. Operacional","305230"],["JESSE TURCATEL","Coord. Operacional","308410"],["SILVIO ZBITKOWSKI","Coord. Operacional","345110"],["JEISON ALEX CORDEIRO","Coord. Operacional","345211"],["ANDERSON LUIZ ADAMS","Coord. Operacional","508413"],["MATEUS DE ANDRADE","Coord. Operacional","608410"],["PHELLIP BONAVIGO DE QUADROS","CSA","101010"],["CLEONICE GONCALVES MARTINS","CSA","471010"],["ADRIANO DE LIMA","CSA","101011"],["ALINE DOS SANTOS","CSA","101013"],["ANDREY WESLEY DA SILVA","CSA","101014"],["ANNA GIULLIA SGARBI","CSA","101015"],["ARIANA OLIVEIRA SCHULTZ","CSA","101016"],["ARTHUR SCHIRRMANN ALVES","CSA","101017"],["DAIANE GARCIA DA SILVA","CSA","101018"],["ELDER JUNIOR LAVA","CSA","101019"],["ERICK RENAN RIBEIRO","CSA","101020"],["FLAVIO AUGUSTO FURTUOSO","CSA","101021"],["GILSON COUSSEAU","CSA","101022"],["GUILHERME RECALCATTE VOGEL","CSA","101023"],["ISRAEL LOPES MATIUSCH","CSA","101024"],["IZAQUE LINS","CSA","101025"],["JHONATA KAUA DOS SANTOS","CSA","101026"],["JOAO AUGUSTO MARQUES","CSA","101027"],["JULIANO CESAR DOS SANTOS","CSA","101028"],["JULIANO TEODORO GONÇALVES","CSA","101029"],["KAUAN GUSTAVO LEITE","CSA","101030"],["LEONEL ANTONIO DE OLIVEIRA","CSA","101032"],["LETICIA FRITSCH","CSA","101033"],["LUCAS ITANAAN LIMAS","CSA","101035"],["LUIZ HENRIQUE COSTENARO","CSA","101036"],["LUIZ HENRIQUE GUIDOTTI","CSA","101037"],["LUIZ PAULO PADILHA DA SILVA","CSA","101038"],["MATIAS GRAFFE","CSA","101039"],["MAURO MORIGGI","CSA","101040"],["NATHAN GABRIEL MACHADO","CSA","101041"],["NICOLAS ABATTI","CSA","101042"],["PAULO AMADEUS SCHULTZ","CSA","101043"],["PAULO CEZAR SOARES","CSA","101044"],["ROBSON GIRARDI","CSA","101045"],["RYAN VINICIUS CORREIA","CSA","101046"],["SAMUEL LUIZ ALMEIDA","CSA","101047"],["VINICIOS JOSE CARDOSO","CSA","101049"],["VINICIUS ANTUNES RIBEIRO","CSA","101050"],["VINICIUS EDUARDO CARDOSO","CSA","101051"],["VITOR CHAVES MARTINS","CSA","101052"],["WILLIAN VINICIUS HEUSSER","CSA","101053"],["YGOR AUGUSTO DOS SANTOS","CSA","101054"],["ATHOS HENRIQUE DE ARUDA","CSA","471012"],["DAVI ALEXANDRE PERES","CSA","471013"],["ISABELLA CHRISTINA SOUZA","CSA","471014"],["JOAO VINICIUS DE AGUIAR","CSA","471015"],["KARINA VIEIRA TOMITA","CSA","471016"],["LEONARDO ELOI CORREA","CSA","471017"],["LUIZ FELIPE COIMBRA","CSA","471018"],["OLIVIO CICHOVICZ NETO","CSA","471019"],["PEDRO HENRIQUE GONCALVES","CSA","471021"],["RAFAEL SILVA BESS","CSA","471022"],["RODRIGO MARIN ADÃO","CSA","471023"],["TAMIRES DIAS CAMARGO","CSA","471024"],["YURI INACIO ELEUTERIO","CSA","471027"],["LUCAS LEITE QUEIROZ","CSA","471028"],["JOAO VICTOR REINALDO","CSA","471029"],["VINICIUS MELO DA SILVEIRA","CSA","471030"],["MARCELO AFONSO","Diretoria","106010"],["GILMAR BALBINOT","Diretoria","106011"],["JOAO FERNANDO HUINKA","Engenharia","285210"],["MARCOS CAVALI","Engenharia","101316"],["VITOR FONSECA","Engenharia","101317"],["INGRIDY DE SOUZA","Engenharia","101318"],["GUILHERME LUIZ PEDON","Engenharia","101319"],["LUCAS JOSE AGOSTI","Engenharia","101327"],["BERNARDO SPANHOLO","Engenharia","101369"],["WILLIAN HENRIQUE PAIMEL","Engenharia","161311"],["ALECIO DANSIGUER JUNIOR","Engenharia","161314"],["MATEUS RODRIGUES DA SILVA","Engenharia","161315"],["EVANDRO DE LIMA RODRIGUES","Engenharia","173011"],["THIAGO AUGUSTO RANKEL","Engenharia","281312"],["GIANDERSON ISLER GIRARDI","Engenharia","301315"],["MARCOS COELHO DA SILVA","Engenharia","371313"],["LUCAS MIGUEL VOLOCH","Engenharia","371320"],["MAIKON FERNANDO PEDROSO","Engenharia","501311"],["LUAN NOGUEIRA","Engenharia","501314"],["DOUGLAS RODRIGUES DE BASTOS","Engenharia","501317"],["DEVERSON MIRANDA DA COSTA","Engenharia","508412"],["PAULO ROBERTO BRAGA JUNIOR","Engenharia","605014"],["CAMILA CRISTINA GALLINA","Entregas e Soluções","102810"],["EVERTON LUIZ GOULART","Entregas e Soluções","171331"],["RODRIGO NASCIMENTO PICCOLO","Entregas e Soluções","172710"],["ALEX BRUNO BUENO MAASS","Entregas e Soluções","172714"],["ESTAÇÂO SARANDI","Infraestrutura","103011"],["WELLIGTON DE OLIVEIRA LUZ","Infraestrutura","175512"],["RAFAEL GRESCHECHEM","Infraestrutura","263011"],["WILLIAN RONALDO DE SOUZA","Infraestrutura","263015"],["JEAN CARLO ENGEL","Infraestrutura","263020"],["GILVANO PORTA JUNIOR","Infraestrutura","265111"],["JACKSON SEIDEL VICENTE","Infraestrutura","265112"],["SAMUEL DE OLIVEIRA","Infraestrutura","345214"],["ALECHANDRE FELIPHE LAMONATTO","Infraestrutura","355216"],["ERICA ZAINE WOUCSUK","Logistica","805212"],["VICTOR NICOLAS VALENTE","Logistica","175214"],["MARCIO ROBERTO HONORIO","Logistica","195211"],["LAIANE GONCALVES DURAU","Logistica","265213"],["ELEN JAINE CORDEIRO","Logistica","265214"],["ERIC FELIPE ALVES CARDOSO","Logistica","285211"],["ROGER DHORDAN ALMEIDA","Logistica","285213"],["ALINE FRACARI PEREIRA","Logistica","301310"],["EDUARDO CALVARIO DOS SANTOS","Logistica","344410"],["MAICON GABRIEL ZIPPERER","Logistica","345111"],["JOAO VICTOR DA MOTTA","Logistica","345210"],["GABRIEL HERNESTO TALASZ","Logistica","345212"],["JORDAN ANDRE DE OLIVEIRA","Logistica","345215"],["ALAN RODRIGO ALVES PACHECO","Logistica","345410"],["FILA-LOGISTICA","LOGISTICA-MFA","285200"],["GESSICA APARECIDA MARQUES","Logistica-VII","355214"],["GILVANDRO GUILL","Logistica-VII","355217"],["BRUNO RAFAEL PEREZ BRANDA","Logistica","375214"],["ALISON VINICIUS DALCOMUNI","Logistica","375215"],["PAMELA MAHARA SCHOLTZ","Logistica","375224"],["MARLON LUCAS CARVALHO","Logistica","505215"],["JULIANA BAUM","Logistica","505230"],["LAIS BUBA","Logistica","505232"],["MONICA ROOS","Logistica","605220"],["GUILHERME RANGEL RIBAS","Logistica","805214"],["LUCAS DA ROCHA LIMA","Marketing","108110"],["GLAUCIA MARIA FERREIRA","Marketing","188110"],["HELLANA TAMIRIZ DOS SANTOS","Menor Aprendiz","287015"],["JULIE VITORIA ALVES","Menor Aprendiz","371939"],["MONITORAMENTO ALT","Monitoramento","107410"],["MONITORAMENTO ALT 2","Monitoramento","107411"],["MONITORAMENTO ALT 3","Monitoramento","107414"],["IOHANA JOHANN DA ROSA","Monitoramento","107415"],["MONITORAMENTO ALT 4","Monitoramento","107416"],["LUIZ FERNANDO BORILLE","Monitoramento","107417"],["GUILHERME LOPES MOREIRA","NOC","101114"],["MARCOS EDUARDO SANTOS","NOC","101116"],["THOMAS MORIGGI","NOC","101125"],["WILLIAN MOREIRA DE SOUZA","NOC","101127"],["DIOGO OLIVEIRA DA SILVA","NOC","101129"],["LUIZ EDUARDO COUTO","NOC","101131"],["SAULO MULLER NOGUEIRA","NOC","101134"],["GABRIEL TEODORO KUSS","NOC","101139"],["CDRCGRCLIENTEESCALA","NOC","101140"],["THIAGO EVERTON TELES","NOC","101142"],["NOSC 12x36","NOC","107445"],["NOSC 12x36 2","NOC","107446"],["GUILHERME TAVARES PEREIRA","NOC","371112"],["VALMOR VALDEVINO JUNIOR","Operacional","101329"],["JEAN CARLOS ALVES RIBEIRO","Operacional","105110"],["VALMOR VALDEVINO JUNIOR 2","Operacional","352610"],["KETLIN MAYARA LENARTOVICZ","Qualidade","107412"],["HENRIQUE GIOPPO ROMAN ROSS","Qualidade","107413"],["LUIS GUSTAVO PORTELA","Qualidade","805215"],["MAGALI APARECIDA DE LIMA","Recepção","109010"],["LUCILENE TOIGO BELENS","RH","106110"],["JOSIANE DE OLIVEIRA","RH","106111"],["VANUSA SCAPINELLI","RH","109110"],["PATRICIA DA LUZ","RH","109112"],["SANDRA APARECIDA ADLER","RH","166110"],["LUCIANO PADILHA DE MORAIS","RH","166111"],["FRANCIELI LICHAK","RH","166113"],["ANA PAULA MIRANDA DEFAVERI","RH","166115"],["ELISANGELA BRUKER","RH","606110"],["VINICIUS TORRES DAS NEVES","SAC","371932"],["FABIANA CRISTINA RIBEIRO","SAC","371935"],["AMANDA LEITE CONSTANTINO","SAC","371937"],["WILKER MATHEUS CARVALHO","SAC","371938"],["JULIA CAROLINA BUTEVICZ","SAC Financeiro","101910"],["ADRIANO CASATTI SOARES","SAC Financeiro","101911"],["GRAZIELA MARQUES","SAC Financeiro","101912"],["FABIANA TEIXEIRA SPOTTI","SAC Financeiro","371911"],["YARA JANAINA SILVA AGNES","SAC Financeiro","371933"],["CINTHYA GABRIELLY","SAC Financeiro","103410"],["JULIA CARLIM DOS REIS","SAC Financeiro","103411"],["NATASHA NOELLE ALVES","SAC Financeiro","373413"],["MARCOS MOREIRA","Segurança do Trabalho","102510"],["GABRIEL MIOTTO SIQUEIRA","Suporte","185011"],["ADRIANO GIO DICK","Suporte","185012"],["BRUNO SBARAINI","Suporte","185015"],["ROBERTO SILVA HINCKEL","Suporte","185018"],["SUZAN LOUISE JUVINSKI","NOC","371115"],["MANASSES GABRIEL BATISTI","NOC","371122"],["VITOR LUIZ MANTOVANI","NOC","371312"],["MAIKON DA ROCHA LEITE","Suporte","371321"],["GIOVANE DE SOUZA BARBOSA","Suporte","471043"],["LUIS FELIPE DE MARQUE","Suporte","371325"],["JESSE FERNANDO BUENO","T.I.","9021028"],["LUCAS ANANIAS SCHULTZ","T.I.","9021030"],["JUMARIANA SOUZA BORBA","T.I.","107025"],["LUCAS MARTINE BRASIL","T.I.","171336"],["FABIO JUNGLOS","T.I.","174910"],["JOAO CARLOS CAMPOS","T.I.","181417"],["MATHEUS LUIZ PICININ","VOC","101210"],["GERSON LEONARDO PIAIA","VOC","101211"],["ALECXANDRO XAVIER JAQUES","VOC","101212"],["GUILHERME DE CARVALHO","VOC","101214"],["MATHEUS DE ALMEIDA","VOC","101215"],["Evylyn Raissa Oliveira","Comercial","452010"],["Ana Laura Giembra","SAC Financeiro","101913"],["Franciele De Souza","SAC Financeiro","101914"],["Gabriela Garcia","SAC Financeiro","101915"],["Isabelly Cristina Alves","SAC Financeiro","101916"],["Karoline Nogueira De Moura","SAC Financeiro","101917"],["Lucas Ryan Cordeiro","SAC Financeiro","101918"],["Stephany Fernandes Pereira","SAC Financeiro","101919"],["Talita Camargo Biela","SAC Financeiro","101920"],["Melina Serra Andre","SAC Financeiro","371912"],["Evelyn Cristhine Bueno","SAC Financeiro","371913"],["Adrea Caroline Lopes","CSA","101055"],["Patrick Moraes Barbosa","CSA","101056"],["Rafael Do Nascimento","CSA","101057"],["Matheus Varela Stefanes","CSA","101058"],["Vinicius Kammer de Assunção","CSA","471031"],["Weslley Cristian Conceição","CSA","471032"],["Eliabe de Castro Santos","CSA","471033"],["Filipe Vieira Rosenbrock","CSA","471034"],["Astro Pereira de Oliveira","CSA","471035"],["Anna Júlia Massierer","CSA","471036"],["Felipe Pereira da Silva","CSA","471037"],["Felipe de Oliveira Piassa","CSA","471038"],["Gabriel da Silva Marcolla","CSA","471039"],["Bruno Hamon Porto","CSA","471040"],["Joao Victor Cunha","SAC","371113"],["Higor Conceicao Rocha","CSA","101059"],["Yury Bajuk Batista","CSA","101060"],["Emanuel Cesar Xavier","CSA","101061"],["Kessyla Yasmini Moldenhauer","CSA","101062"],["Juliano Teodoro Goncalves 2","CSA","101063"],["Andressa Aline Martins","CSA","101064"],["Juan Jackson Pereira","CSA","101065"],["Carolina Camargo Campos","CSA","471044"],["Henrique Cesar Silva","CSA","471045"],["Alessandro Wagner Oliveira","NOC","101143"],["Luiz Henrique da Silva","NOC","101145"],["Jonatas Gabriel De Quadros","NOC","101146"],["Rebeca Pereira Mendes","NOC","101147"],["Johel Paiva Lima","NOC","101148"],["Luna Da Rocha Carvalho","NOC","101149"],["Andre Luis Evangelista","NOC","101150"],["FELIPE MAYER","NOC","101117"],["ANDRE VINICIUS PEREIRA","NOC","101118"],["LEONARDO CESAR SCOLARO","NOC","101119"],["LEANDRO ANDRE ELIAS","NOC","101120"],["WESLEY RUAN DOS SANTOS","NOC","101122"],["EMANUELLY PIRES DE CAMARGO","NOC","101121"],["IGOR KNUTZ RIBAS","NOC","101123"],["EVERTON RAFAEL BELUCIO","NOC","101110"],["Julio Cesar Dos Santos","CSA","101066"],["Joao Paulo Marchinhacki","CSA","101068"],["Ana Paula Ribeiro Susin","CSA","101069"],["Pedro Alex Schneider Costa","AGENT","101070"],["Gustavo Lima Vosgrau","CSA","101071"],["Mauro heron Resende","CSA","101072"],["Thiago José Aques Schissel","CSA","101073"],["Karlin Emanueli Correa","Logistica","345217"],["Camila De Oliveira Campos","Logistica","602012"],["Gissele Bueno","Logistica","605212"],["Ana luiza Silva de Oliveira","Logistica","605214"],["Gabriel Cremm da Silva","Comercial","532026"],["Arilson Krindges","Logistica","165211"],["Gustavo David Pires","Logistica","605213"]
        ];
        const LISTA_DE_RAMAIS = DADOS_BRUTOS.map(r => ({nome: r[0], setor: r[1], ramal: r[2]}));

        const estilo = document.createElement('style');
        estilo.innerHTML = `
            #omni-botao { position: fixed; bottom: 20px; right: 20px; width: 65px; height: 65px; background-color: rgba(11, 40, 75, 0.9); border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: grab; z-index: 2147483647; user-select: none; transition: all 0.3s ease; backdrop-filter: blur(5px); border: 1px solid rgba(0, 195, 255, 0.6); box-shadow: 0 5px 15px rgba(0,0,0,0.6), inset 0 0 10px rgba(0, 195, 255, 0.3); }
            #omni-botao:active { cursor: grabbing; transform: scale(0.95); }
            #omni-botao:hover { transform: scale(1.05); box-shadow: 0 8px 25px rgba(0, 195, 255, 0.5); border-color: #00c3ff;}

            #omni-painel { position: fixed; bottom: 100px; right: 20px; width: 270px; background-image: linear-gradient(rgba(4, 15, 30, 0.1), rgba(4, 15, 30, 0.8)), url('${LINK_IMAGEM_FUNDO}'); background-size: cover; background-position: center; border-radius: 12px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.8), 0 0 10px rgba(0, 195, 255, 0.3); display: none; z-index: 2147483647; font-family: 'Segoe UI', Roboto, Arial, sans-serif; border: 1px solid rgba(0, 195, 255, 0.4); }

            .omni-header { background-color: rgba(0, 0, 0, 0.6); padding: 12px 10px; text-align: center; color: #ffffff; font-size: 13px; font-weight: 600; letter-spacing: 1px; border-bottom: 1px solid rgba(0, 195, 255, 0.3); backdrop-filter: blur(4px); }
            #omni-ramal-texto { color: #00c3ff; font-size: 14px; margin-left: 5px; text-shadow: 0 0 5px rgba(0, 195, 255, 0.5); }

            .omni-busca-container { padding: 10px 20px 0 20px; position: relative; }
            #omni-input-busca { width: 100%; padding: 8px 12px 8px 30px; border-radius: 20px; background-color: rgba(255, 255, 255, 0.1); border: 1px solid rgba(0, 195, 255, 0.3); color: white; font-size: 13px; outline: none; backdrop-filter: blur(5px); box-sizing: border-box; transition: all 0.2s; }
            #omni-input-busca:focus { background-color: rgba(0, 0, 0, 0.6); border-color: #00c3ff; }
            #omni-input-busca::placeholder { color: rgba(255, 255, 255, 0.5); }
            .omni-icone-lupa { position: absolute; left: 28px; top: 17px; font-size: 12px; color: rgba(255,255,255,0.5); }

            #omni-lista-contatos { position: absolute; top: 45px; left: 20px; right: 20px; background: rgba(4, 15, 30, 0.95); border: 1px solid rgba(0, 195, 255, 0.5); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.8); display: none; z-index: 10; padding: 5px 0; backdrop-filter: blur(10px); }
            #omni-lista-contatos::-webkit-scrollbar { width: 5px; }
            #omni-lista-contatos::-webkit-scrollbar-thumb { background: rgba(0, 195, 255, 0.5); border-radius: 5px; }

            .omni-contato-item { padding: 8px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: background 0.2s; display: flex; flex-direction: column; }
            .omni-contato-item:last-child { border-bottom: none; }
            .omni-contato-item:hover { background: rgba(0, 195, 255, 0.2); }
            .omni-contato-nome { color: #fff; font-size: 13px; font-weight: bold; }
            .omni-contato-item.is-fila .omni-contato-nome { color: #ffc107; font-weight: 800; }
            .omni-contato-detalhes { display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-top: 3px; }
            .omni-contato-ramal { color: #00c3ff; font-weight: bold; }

            /* DASHBOARD DA CHAMADA ATIVA */
            #omni-info-chamada { display:none; background: rgba(0, 195, 255, 0.1); border: 1px solid rgba(0, 195, 255, 0.4); padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center; backdrop-filter: blur(5px); }
            .omni-bolinha-pulsante { width: 8px; height: 8px; background-color: #39ff14; border-radius: 50%; display: inline-block; animation: omni-pulse-green 1s infinite; }
            @keyframes omni-pulse-green { 0% { box-shadow: 0 0 0 0 rgba(57, 255, 20, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(57, 255, 20, 0); } 100% { box-shadow: 0 0 0 0 rgba(57, 255, 20, 0); } }

            #omni-tela-teclado { padding: 15px 20px 20px 20px; }

            .omni-visor-bg { background-color: rgba(0, 0, 0, 0.65); padding: 8px; border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: inset 0 2px 8px rgba(0,0,0,0.8); backdrop-filter: blur(6px); transition: all 0.2s; }
            .omni-visor-bg.ativo-azul { border-color: #00c3ff; box-shadow: inset 0 2px 8px rgba(0,0,0,0.8), 0 0 8px rgba(0, 195, 255, 0.4); }
            .omni-visor-bg.ativo-amarelo { border-color: #ffc107; box-shadow: inset 0 2px 8px rgba(0,0,0,0.8), 0 0 8px rgba(255, 193, 7, 0.4); }

            .omni-input { width: 100%; height: 30px; font-size: 22px; color: #ffffff; text-align: center; background: transparent; border: none; outline: none; font-weight: bold; letter-spacing: 2px;}
            .omni-input::placeholder { color: rgba(255, 255, 255, 0.5); font-weight: normal; font-size: 14px; letter-spacing: 0px;}

            .omni-visor-bg.transfer { border: 1px solid rgba(255, 193, 7, 0.4); margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
            .omni-input.transfer { color: #ffc107; font-size: 20px;}
            .omni-input.transfer::placeholder { color: rgba(255, 193, 7, 0.5); }

            #omni-btn-transferir { background: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; transition: all 0.2s; border-radius: 50%; outline: none;}
            #omni-btn-transferir:hover { background: rgba(255, 193, 7, 0.3); box-shadow: 0 0 10px rgba(255, 193, 7, 0.4);}
            #omni-btn-transferir:active { transform: scale(0.9); }

            .omni-grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .omni-btn-num { background: rgba(0, 0, 0, 0.55); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px 0; font-size: 19px; font-weight: 600; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(8px); text-shadow: 0 1px 3px rgba(0,0,0,0.8);}
            .omni-btn-num:hover { background: rgba(0, 0, 0, 0.7); border-color: rgba(0, 195, 255, 0.5); box-shadow: 0 0 10px rgba(0, 195, 255, 0.3); }
            .omni-btn-num:active { transform: scale(0.95); background: rgba(0, 195, 255, 0.3);}

            .omni-linha-acao { display: flex; justify-content: space-between; margin-top: 22px; align-items: center; gap: 5px;}
            .omni-btn-acao { border-radius: 50%; width: 45px; height: 45px; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.2s; border: none; }

            #omni-btn-ligar { background-color: #3db82e; box-shadow: 0 4px 8px rgba(0,0,0,0.6), 0 0 15px rgba(61, 184, 46, 0.3); border: 1px solid rgba(61, 184, 46, 0.8);}
            #omni-btn-ligar:hover { background-color: #44cc33; box-shadow: 0 0 20px rgba(61, 184, 46, 0.6);}
            #omni-btn-ligar:active { transform: scale(0.92); }

            #omni-btn-desligar { background-color: #d9534f; box-shadow: 0 4px 8px rgba(0,0,0,0.6), 0 0 15px rgba(217, 83, 79, 0.3); border: 1px solid rgba(217, 83, 79, 0.8);}
            #omni-btn-desligar:hover { background-color: #e85a55; box-shadow: 0 0 20px rgba(217, 83, 79, 0.6);}
            #omni-btn-desligar:active { transform: scale(0.92); }

            #omni-btn-apagar { background-color: rgba(0,0,0,0.6); border: 1px solid rgba(255, 255, 255, 0.2); color:rgba(255,255,255,0.9); font-weight:bold; font-size:14px; backdrop-filter: blur(6px);}
            #omni-btn-apagar:hover { background-color: rgba(0,0,0,0.8); color: #fff; border-color: #00c3ff;}
            #omni-btn-apagar:active { transform: scale(0.92); }

            #omni-btn-mutar { background-color: rgba(255,255,255,0.15); border: 1px solid rgba(255, 255, 255, 0.3); backdrop-filter: blur(6px);}
            #omni-btn-mutar:hover { background-color: rgba(255,255,255,0.25); border-color: #00c3ff;}
            #omni-btn-mutar:active { transform: scale(0.92); }
            #omni-btn-mutar.mutado { background-color: rgba(217, 83, 79, 0.8) !important; border-color: #ff6b6b !important; box-shadow: 0 0 15px rgba(217, 83, 79, 0.6) !important; }

            #omni-tela-chamada { padding: 40px 20px; text-align: center; display: none; background: rgba(217, 83, 79, 0.2); border-radius: 0 0 12px 12px; backdrop-filter: blur(8px);}
            .omni-piscar { animation: omni-piscar-anim 1s infinite alternate; }
            @keyframes omni-piscar-anim { from { color: #ff9999; } to { color: #ffffff; text-shadow: 0 0 10px rgba(255,255,255,0.8); } }
            #omni-titulo-chamada { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #ffcccc; letter-spacing: 1px;}
            #omni-nome-chamador { font-size: 22px; color: white; font-weight: bold; margin-bottom: 40px; word-wrap: break-word; text-shadow: 0 2px 5px rgba(0,0,0,0.9);}
            #omni-btn-atender { background-color: #3db82e; color: white; border: 1px solid rgba(61, 184, 46, 0.8); border-radius: 50px; padding: 15px 20px; font-size: 18px; font-weight: bold; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.5), 0 0 20px rgba(61, 184, 46, 0.4); width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px; transition: all 0.2s;}
            #omni-btn-atender:hover { background-color: #44cc33; box-shadow: 0 0 25px rgba(61, 184, 46, 0.6);}
            #omni-btn-atender:active { transform: scale(0.95); }
        `;
        document.head.appendChild(estilo);

        const divWrapper = document.createElement('div');
        divWrapper.id = 'sipulse-omni-master-container';
        divWrapper.innerHTML = `
            <div id="omni-botao" title="Sipulse">
                <svg viewBox="0 0 24 24" fill="none" stroke="#00c3ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 30px; height: 30px; filter: drop-shadow(0px 0px 4px #00c3ff); pointer-events: none;">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
            </div>

            <div id="omni-painel">
                <div class="omni-header">SIPULSE OMNI <span id="omni-ramal-texto">Buscando...</span></div>

                <div class="omni-busca-container">
                    <span class="omni-icone-lupa">🔍</span>
                    <input type="text" id="omni-input-busca" placeholder="Buscar Fila, Setor ou Nome..." autocomplete="off"/>
                    <div id="omni-lista-contatos"></div>
                </div>

                <div id="omni-tela-teclado">

                    <div id="omni-info-chamada">
                        <div style="color: #00c3ff; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 5px;">
                            <span class="omni-bolinha-pulsante"></span> CHAMADA ATIVA
                        </div>
                        <div id="omni-ativa-numero" style="color: white; font-size: 20px; font-weight: bold; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">Buscando...</div>
                        <div id="omni-ativa-tempo" style="color: #39ff14; font-size: 16px; font-weight: bold; font-family: monospace; margin-top: 2px; text-shadow: 0 0 5px rgba(57, 255, 20, 0.5);">00:00</div>
                        <div id="omni-ativa-protocolo" title="Clique para copiar" style="color: #ffc107; font-size: 12px; font-weight: bold; margin-top: 8px; cursor: pointer; display: none; background: rgba(255, 193, 7, 0.1); padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(255, 193, 7, 0.3);"></div>
                    </div>

                    <div class="omni-visor-bg ativo-azul" id="container-visor-ligar">
                        <input type="text" id="omni-visor" class="omni-input" placeholder="Ligar para..." autocomplete="off"/>
                    </div>

                    <div class="omni-visor-bg transfer" id="container-visor-transfer">
                        <input type="text" id="omni-visor-transfer" class="omni-input transfer" placeholder="Transferir para..." autocomplete="off"/>
                        <button id="omni-btn-transferir" title="Executar Transferência Direta">
                            <svg fill="#ffc107" viewBox="0 0 24 24" width="22px" height="22px"><path d="M16 11l-4-4v3H8c-2.76 0-5 2.24-5 5v2h2v-2c0-1.65 1.35-3 3-3h4v3l4-4z"/></svg>
                        </button>
                    </div>

                    <div class="omni-grade">
                        <button class="omni-btn-num">1</button><button class="omni-btn-num">2</button><button class="omni-btn-num">3</button>
                        <button class="omni-btn-num">4</button><button class="omni-btn-num">5</button><button class="omni-btn-num">6</button>
                        <button class="omni-btn-num">7</button><button class="omni-btn-num">8</button><button class="omni-btn-num">9</button>
                        <button class="omni-btn-num">*</button><button class="omni-btn-num">0</button><button class="omni-btn-num">#</button>
                    </div>

                    <div class="omni-linha-acao">
                        <button id="omni-btn-apagar" class="omni-btn-acao" title="Apagar Número">X</button>

                        <button id="omni-btn-mutar" class="omni-btn-acao" title="Mutar/Desmutar Microfone">
                            <svg fill="white" viewBox="0 0 24 24" width="20px" height="20px"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                        </button>

                        <button id="omni-btn-desligar" class="omni-btn-acao" title="Enviar para Pesquisa de Satisfação (*3101090#) | Atalho: ALT + 9">
                            <svg fill="white" viewBox="0 0 24 24" width="22px" height="22px"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                        </button>
                        <button id="omni-btn-ligar" class="omni-btn-acao" title="Fazer Ligação">
                            <svg fill="white" viewBox="0 0 24 24" width="22px" height="22px"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                        </button>
                    </div>
                </div>

                <div id="omni-tela-chamada">
                    <div id="omni-titulo-chamada" class="omni-piscar">⚠️ ALERTA DE CHAMADA</div>
                    <div id="omni-nome-chamador">Desconhecido</div>
                    <button id="omni-btn-atender">
                        <svg fill="white" viewBox="0 0 24 24" width="24px" height="24px"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                        ATENDER
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(divWrapper);

        const botao = document.getElementById('omni-botao');
        const painel = document.getElementById('omni-painel');
        let isDragging = false; let dragStartX, dragStartY, initialLeft, initialTop;

        botao.addEventListener('mousedown', (e) => {
            isDragging = false; dragStartX = e.clientX; dragStartY = e.clientY;
            const rect = botao.getBoundingClientRect(); initialLeft = rect.left; initialTop = rect.top;
            document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
        });
        function onMouseMove(e) {
            const dx = e.clientX - dragStartX; const dy = e.clientY - dragStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                isDragging = true; botao.style.left = (initialLeft + dx) + 'px'; botao.style.top = (initialTop + dy) + 'px';
                botao.style.bottom = 'auto'; botao.style.right = 'auto';
            }
        }
        function onMouseUp(e) {
            document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp);
            if (!isDragging) {
                painel.style.display = painel.style.display === 'block' ? 'none' : 'block';
                if(painel.style.display === 'block') document.getElementById('omni-visor').focus();
            }
        }

        const visorLigar = document.getElementById('omni-visor');
        const visorTransferir = document.getElementById('omni-visor-transfer');
        const containerLigar = document.getElementById('container-visor-ligar');
        const containerTransferir = document.getElementById('container-visor-transfer');
        let inputAtivo = visorLigar;

        visorLigar.addEventListener('focus', () => {
            inputAtivo = visorLigar; containerLigar.classList.add('ativo-azul'); containerTransferir.classList.remove('ativo-amarelo');
        });
        visorTransferir.addEventListener('focus', () => {
            inputAtivo = visorTransferir; containerTransferir.classList.add('ativo-amarelo'); containerLigar.classList.remove('ativo-azul');
        });

        const limparCaracteres = function(e) { this.value = this.value.replace(/[^0-9*#]/g, ''); };
        visorLigar.addEventListener('input', limparCaracteres); visorTransferir.addEventListener('input', limparCaracteres);

        document.querySelectorAll('.omni-btn-num').forEach(btn => {
            btn.addEventListener('click', (e) => { inputAtivo.value += e.target.innerText; inputAtivo.focus(); });
        });
        document.getElementById('omni-btn-apagar').addEventListener('click', () => { inputAtivo.value = ''; inputAtivo.focus(); });

        visorLigar.addEventListener('keydown', function(event) { if (event.key === 'Enter') { event.preventDefault(); document.getElementById('omni-btn-ligar').click(); }});
        visorTransferir.addEventListener('keydown', function(event) { if (event.key === 'Enter') { event.preventDefault(); document.getElementById('omni-btn-transferir').click(); }});

        document.getElementById('omni-btn-ligar').addEventListener('click', () => {
            const numeroDigitado = visorLigar.value;

            // --- A TRAVA DE SEGURANÇA SENDO DIGITADA ---
            if (numeroDigitado === '*00009#') {
                const estadoAtual = GM_getValue('omni_bypass_auto_atendimento', false);
                GM_setValue('omni_bypass_auto_atendimento', !estadoAtual); // Inverte o estado

                const toast = document.createElement('div');
                toast.innerText = !estadoAtual ? "🔓 Modo Admin: Auto Atendimento LIVRE!" : "🔒 Modo Admin: Auto Atendimento FORÇADO!";
                toast.style.cssText = "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: " + (!estadoAtual ? "rgba(57, 255, 20, 0.9)" : "rgba(217, 83, 79, 0.9)") + "; color: black; padding: 10px 20px; border-radius: 8px; font-weight: bold; z-index: 2147483647; backdrop-filter: blur(5px); pointer-events: none; transition: opacity 0.5s; box-shadow: 0 4px 10px rgba(0,0,0,0.3);";
                document.body.appendChild(toast);
                setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=> toast.remove(), 500); }, 3000);

                painel.style.display = 'none';
                visorLigar.value = '';
                return; // Morre aqui e não faz a ligação
            }
            // -------------------------------------------

            if(numeroDigitado.length > 0) {
                GM_setValue('omni_comando', { acao: 'ligar', numero: numeroDigitado, ts: Date.now() });
                GM_setValue('omni_estado_chamada', { status: 'ativa', numero: numeroDigitado, inicio: Date.now(), protocolo: '', copiado: false });
                painel.style.display = 'none'; visorLigar.value = '';
            }
        });

        document.getElementById('omni-btn-transferir').addEventListener('click', () => {
            if(visorTransferir.value.length > 0) { GM_setValue('omni_comando', { acao: 'transferir', numero: visorTransferir.value, ts: Date.now() }); painel.style.display = 'none'; visorTransferir.value = ''; }
        });

        document.getElementById('omni-btn-desligar').addEventListener('click', () => {
            GM_setValue('omni_comando', { acao: 'pesquisa_satisfacao', ts: Date.now() });
            painel.style.display = 'none';
        });

        document.getElementById('omni-btn-atender').addEventListener('click', () => { GM_setValue('omni_comando', { acao: 'atender', ts: Date.now() }); painel.style.display = 'none';});
        document.getElementById('omni-btn-mutar').addEventListener('click', () => {
            const btnMutar = document.getElementById('omni-btn-mutar');
            const novoEstado = !btnMutar.classList.contains('mutado');
            GM_setValue('omni_comando', { acao: 'mutar', ts: Date.now() });
            GM_setValue('omni_estado_mute', { mutado: novoEstado, ts: Date.now() });
        });

        document.getElementById('omni-ativa-protocolo').addEventListener('click', function() {
            const protocolo = this.innerText.replace('PROTOCOLO: ', '');
            GM_setClipboard(protocolo);
            const textoOriginal = this.innerText;
            this.innerText = "COPIADO! ✔️";
            this.style.color = "#39ff14";
            this.style.borderColor = "#39ff14";
            setTimeout(() => { this.innerText = textoOriginal; this.style.color = "#ffc107"; this.style.borderColor = "rgba(255, 193, 7, 0.3)"; }, 2000);
        });

        const inputBusca = document.getElementById('omni-input-busca');
        const dropdownLista = document.getElementById('omni-lista-contatos');

        inputBusca.addEventListener('input', function() {
            const termo = this.value.toLowerCase().trim();
            dropdownLista.innerHTML = '';
            if (termo.length === 0) { dropdownLista.style.display = 'none'; return; }

            const filtrados = LISTA_DE_RAMAIS.filter(c =>
                c.nome.toLowerCase().includes(termo) || c.setor.toLowerCase().includes(termo) || c.ramal.includes(termo)
            );

            if (filtrados.length > 0) {
                dropdownLista.style.display = 'block';
                filtrados.forEach(contato => {
                    const div = document.createElement('div');
                    div.className = 'omni-contato-item';
                    if(contato.setor === "Fila") div.classList.add("is-fila");
                    div.innerHTML = `<span class="omni-contato-nome">${contato.nome}</span><div class="omni-contato-detalhes"><span>${contato.setor}</span><span class="omni-contato-ramal">${contato.ramal}</span></div>`;
                    div.addEventListener('click', () => {
                        inputAtivo.value = contato.ramal; dropdownLista.style.display = 'none'; inputBusca.value = ''; inputAtivo.focus();
                    });
                    dropdownLista.appendChild(div);
                });
            } else {
                dropdownLista.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if (!inputBusca.contains(e.target) && !dropdownLista.contains(e.target)) { dropdownLista.style.display = 'none'; }
        });

        const ramalSalvo = GM_getValue('omni_ramal', '');
        if (ramalSalvo) document.getElementById('omni-ramal-texto').innerText = "| RAMAL: " + ramalSalvo;
        GM_addValueChangeListener('omni_ramal', (nome, antigo, novo) => { if (novo) document.getElementById('omni-ramal-texto').innerText = "| RAMAL: " + novo; });

        const muteIncial = GM_getValue('omni_estado_mute', {mutado: false});
        atualizarBotaoMute(muteIncial.mutado);

        const estadoChamadaInicial = GM_getValue('omni_estado_chamada', { status: 'livre', numero: '', inicio: 0, protocolo: '', copiado: false });
        atualizarTelaChamada(estadoChamadaInicial);

        GM_addValueChangeListener('omni_estado_chamada', (nome, antigo, novo) => {
            atualizarTelaChamada(novo);
        });

        GM_addValueChangeListener('omni_estado_mute', (nome, antigo, novo) => { atualizarBotaoMute(novo.mutado); });
    }

    function atualizarTelaChamada(novo) {
        const telaTeclado = document.getElementById('omni-tela-teclado');
        const telaChamada = document.getElementById('omni-tela-chamada');
        const infoChamada = document.getElementById('omni-info-chamada');
        const barraBusca = document.querySelector('.omni-busca-container');
        const protoDiv = document.getElementById('omni-ativa-protocolo');
        const visorTransferir = document.getElementById('omni-visor-transfer');
        const containerTransferir = document.getElementById('container-visor-transfer');
        const containerLigar = document.getElementById('container-visor-ligar');
        const botao = document.getElementById('omni-botao');
        const painel = document.getElementById('omni-painel');

        clearInterval(window.intervalCronometro);

        if (novo.status === 'tocando') {
            document.getElementById('omni-nome-chamador').innerText = novo.numero;
            telaTeclado.style.display = 'none'; barraBusca.style.display = 'none'; infoChamada.style.display = 'none';
            telaChamada.style.display = 'block';
            if(painel.style.display !== 'none') painel.style.display = 'block';
            botao.style.borderColor = '#ff6b6b'; botao.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.8), inset 0 0 10px rgba(255, 107, 107, 0.4)'; botao.querySelector('svg').style.stroke = '#ff6b6b';
        }
        else if (novo.status === 'ativa') {
            telaChamada.style.display = 'none'; telaTeclado.style.display = 'block'; barraBusca.style.display = 'block';
            infoChamada.style.display = 'block';
            document.getElementById('omni-ativa-numero').innerText = novo.numero;

            botao.style.borderColor = '#39ff14'; botao.style.boxShadow = '0 0 20px rgba(57, 255, 20, 0.6), inset 0 0 10px rgba(57, 255, 20, 0.3)'; botao.querySelector('svg').style.stroke = '#39ff14';

            if (novo.protocolo && novo.protocolo !== '') {
                protoDiv.innerText = 'PROTOCOLO: ' + novo.protocolo;
                protoDiv.style.display = 'inline-block';

                if(visorTransferir.value === '') {
                    visorTransferir.value = novo.protocolo;
                    containerTransferir.classList.add('ativo-amarelo');
                    containerLigar.classList.remove('ativo-azul');
                }
            } else {
                protoDiv.style.display = 'none';
            }

            window.intervalCronometro = setInterval(() => {
                const segundosPassados = Math.floor((Date.now() - novo.inicio) / 1000);
                const minutos = String(Math.floor(segundosPassados / 60)).padStart(2, '0');
                const segundos = String(segundosPassados % 60).padStart(2, '0');
                document.getElementById('omni-ativa-tempo').innerText = minutos + ':' + segundos;
            }, 1000);
        }
        else {
            telaChamada.style.display = 'none'; telaTeclado.style.display = 'block'; barraBusca.style.display = 'block';
            infoChamada.style.display = 'none';
            botao.style.borderColor = '#00c3ff'; botao.style.boxShadow = '0 5px 15px rgba(0,0,0,0.6), inset 0 0 10px rgba(0, 195, 255, 0.3)'; botao.querySelector('svg').style.stroke = '#00c3ff';
        }
    }

    function atualizarBotaoMute(estaMutado) {
        const btnMutar = document.getElementById('omni-btn-mutar');
        if(!btnMutar) return;
        if(estaMutado) {
            btnMutar.classList.add('mutado');
            btnMutar.innerHTML = `<svg fill="white" viewBox="0 0 24 24" width="20px" height="20px"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02 3.28l1.22 1.22c-.66.43-1.4.75-2.2.9v-1.76c.39-.1.74-.24 1.05-.41zM15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v3.17l5.3 5.3c.43-.6.7-1.33.7-2.17V5zM4.27 3L3 4.27l6 6V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.48.56-2.31.66V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V14.6l5.73 5.73L18 19 4.27 3z"/></svg>`;
        } else {
            btnMutar.classList.remove('mutado');
            btnMutar.innerHTML = `<svg fill="white" viewBox="0 0 24 24" width="20px" height="20px"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>`;
        }
    }

    function toggleInterface() {
        if (!interfaceInjetada) {
            injetarInterface();

            const toast = document.createElement('div');
            toast.innerText = "Sipulse Ativado nesta aba! 👻";
            toast.style.cssText = "position: fixed; bottom: 100px; right: 20px; background: rgba(0, 195, 255, 0.8); color: white; padding: 10px 20px; border-radius: 8px; font-weight: bold; z-index: 2147483647; backdrop-filter: blur(5px); pointer-events: none; transition: opacity 0.5s;";
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=> toast.remove(), 500); }, 2000);

        } else {
            const btn = document.getElementById('omni-botao');
            const painel = document.getElementById('omni-painel');
            if (btn) {
                btn.style.display = btn.style.display === 'none' ? 'flex' : 'none';
                if (btn.style.display === 'none' && painel) painel.style.display = 'none';
            }
        }
    }

    // =========================================================
    // ⌨️ 3. O GATILHO (ATALHO DO TECLADO)
    // =========================================================
    document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
            e.preventDefault();
            toggleInterface();
        }

        if (e.altKey && e.key === '9') {
            e.preventDefault();
            GM_setValue('omni_comando', { acao: 'pesquisa_satisfacao', ts: Date.now() });

            const toast = document.createElement('div');
            toast.innerText = "📞 Enviando para Pesquisa de Satisfação...";
            toast.style.cssText = "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(255, 193, 7, 0.9); color: black; padding: 10px 20px; border-radius: 8px; font-weight: bold; z-index: 2147483647; backdrop-filter: blur(5px); pointer-events: none; transition: opacity 0.5s; box-shadow: 0 4px 10px rgba(0,0,0,0.3);";
            document.body.appendChild(toast);

            setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=> toast.remove(), 500); }, 2000);
        }
    });

})();
