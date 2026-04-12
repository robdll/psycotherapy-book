export default function PrivacidadePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 text-sm leading-relaxed text-parchment/85">
      <h1 className="font-display text-2xl font-semibold text-parchment">Política de privacidade</h1>
      <p className="text-parchment/55">Última atualização: 12 de abril de 2026.</p>

      <section className="space-y-2 rounded-xl border border-gold/25 bg-navy-800/35 p-5">
        <h2 className="font-display text-base font-semibold text-gold-dim">1. Controlador</h2>
        <p>
          Os dados pessoais tratados por este sistema de agendamento são de responsabilidade da profissional que presta o serviço de
          psicoterapia (controladora), em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-gold/25 bg-navy-800/35 p-5">
        <h2 className="font-display text-base font-semibold text-gold-dim">2. Dados coletados</h2>
        <p>Para agendar e confirmar sessões, podemos tratar:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Nome e e-mail informados no formulário de reserva;</li>
          <li>Dados necessários ao processamento do pagamento PIX (operado pelo provedor de pagamentos, por exemplo Mercado Pago);</li>
          <li>Registros técnicos mínimos (datas/horários de agendamento, identificadores de transação).</li>
        </ul>
        <p>Não é necessário, para o agendamento, informar dados clínicos ou sensíveis neste site.</p>
      </section>

      <section className="space-y-2 rounded-xl border border-gold/25 bg-navy-800/35 p-5">
        <h2 className="font-display text-base font-semibold text-gold-dim">3. Finalidades e bases legais</h2>
        <p>Os dados são usados para:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Executar o contrato de prestação de serviços ou procedimentos preliminares (agendar e confirmar horários);</li>
          <li>Cumprir obrigações legais ou regulatórias aplicáveis à atividade profissional;</li>
          <li>Legítimo interesse em reduzir faltas e fraudes, mediante confirmação por pagamento.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-gold/25 bg-navy-800/35 p-5">
        <h2 className="font-display text-base font-semibold text-gold-dim">4. Compartilhamento</h2>
        <p>
          Dados podem ser compartilhados com o provedor de pagamentos (PIX), com o Google (criação de evento no Google Calendar e Google
          Meet, envio de convites por e-mail) e com a infraestrutura de hospedagem do site, sempre na medida necessária às finalidades
          acima.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-gold/25 bg-navy-800/35 p-5">
        <h2 className="font-display text-base font-semibold text-gold-dim">5. Retenção</h2>
        <p>
          Os dados são mantidos pelo tempo necessário para prestar o serviço, cumprir obrigações legais e resolver disputas. Períodos
          específicos podem ser ajustados pela controladora conforme a prática do consultório.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-gold/25 bg-navy-800/35 p-5">
        <h2 className="font-display text-base font-semibold text-gold-dim">6. Direitos do titular</h2>
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação de dados desnecessários,
          informação sobre compartilhamentos e revogação do consentimento, quando aplicável, entrando em contato com a profissional pelos
          canais divulgados no consultório ou redes profissionais.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-gold/25 bg-navy-800/35 p-5">
        <h2 className="font-display text-base font-semibold text-gold-dim">7. Publicidade profissional</h2>
        <p>
          A divulgação em redes sociais deve observar a Resolução CFP nº 6/2019 e demais normas do Conselho Federal de Psicologia quanto à
          publicidade e à prestação de serviços à distância. Este texto é genérico e não substitui orientação jurídica específica.
        </p>
      </section>
    </main>
  );
}
