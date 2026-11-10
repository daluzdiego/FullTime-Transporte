/**
 * Regras puras do domínio operacional do FullTime.
 * Sem Google Apps Script, rede, relógio global ou serviços pagos.
 * Adaptadores de produção devem fornecer dados e persistir somente após autorização.
 */

export const PRAZO_CONVITE_MS = 2 * 60 * 60 * 1000;

/**
 * Operações são identificadas por nome e particularidades configuráveis.
 * Não impõe campos universais: cada operação pode declarar seu próprio conjunto.
 */
export function validarOperacao(operacao) {
  const erros = [];
  if (!String(operacao?.nome ?? '').trim()) erros.push('NOME_OBRIGATORIO');
  if (operacao?.particularidades == null ||
      typeof operacao.particularidades !== 'object' ||
      Array.isArray(operacao.particularidades)) {
    erros.push('PARTICULARIDADES_DEVEM_SER_OBJETO');
  }
  return { valido: erros.length === 0, erros };
}

/**
 * Motorista pode participar de vários lotes da mesma operação.
 * A mesma participação duplicada no mesmo lote é rejeitada.
 * Conflitos de agenda entre operações diferentes são verificados separadamente.
 */
export function validarParticipacoesMotorista(participacoes) {
  const chaves = new Set();
  const erros = [];
  for (const p of participacoes ?? []) {
    const chave = [p.operacaoId, p.loteId, p.motoristaId].map(String).join('|');
    if (!p.operacaoId || !p.loteId || !p.motoristaId) {
      erros.push({ codigo: 'VINCULO_INCOMPLETO', participacao: p });
    } else if (chaves.has(chave)) {
      erros.push({ codigo: 'PARTICIPACAO_DUPLICADA_NO_LOTE', participacao: p });
    }
    chaves.add(chave);
  }
  return { valido: erros.length === 0, erros };
}

/** Detecta sobreposição de agenda do mesmo motorista/conjunto em operações distintas. */
export function detectarConflitoAgenda(alocacoes) {
  const conflitos = [];
  const validas = (alocacoes ?? []).filter(a =>
    a.motoristaId && a.operacaoId && Number.isFinite(Date.parse(a.inicio)) &&
    Number.isFinite(Date.parse(a.fim)) && Date.parse(a.inicio) < Date.parse(a.fim)
  );
  for (let i = 0; i < validas.length; i++) {
    for (let j = i + 1; j < validas.length; j++) {
      const a = validas[i], b = validas[j];
      if (a.operacaoId === b.operacaoId) continue;
      const mesmoMotorista = a.motoristaId === b.motoristaId;
      const mesmoConjunto = a.conjuntoId && b.conjuntoId && a.conjuntoId === b.conjuntoId;
      const sobrepoe = Date.parse(a.inicio) < Date.parse(b.fim) &&
        Date.parse(b.inicio) < Date.parse(a.fim);
      if ((mesmoMotorista || mesmoConjunto) && sobrepoe) {
        conflitos.push({ alocacaoA: a.id, alocacaoB: b.id,
          recurso: mesmoMotorista ? 'MOTORISTA' : 'CONJUNTO' });
      }
    }
  }
  return conflitos;
}

/** Prazo calculado a partir do instante de envio, nunca do momento de leitura. */
export function calcularExpiracaoConvite(enviadoEm) {
  const inicio = Date.parse(enviadoEm);
  if (!Number.isFinite(inicio)) throw new TypeError('DATA_ENVIO_INVALIDA');
  return new Date(inicio + PRAZO_CONVITE_MS).toISOString();
}

export function conviteExpirou(convite, agora) {
  const prazo = Date.parse(convite?.prazoRespostaEm ?? '');
  const instante = Date.parse(agora ?? '');
  if (!Number.isFinite(prazo) || !Number.isFinite(instante)) {
    throw new TypeError('DATA_CONVITE_OU_AGORA_INVALIDA');
  }
  return instante >= prazo && convite.status === 'PENDENTE';
}

/**
 * A ordem dos candidatos é responsabilidade da política configurada no sistema.
 * Esta função não inventa prioridade: recebe a lista já ordenada e retorna o primeiro elegível.
 */
export function selecionarProximoElegivel(candidatos) {
  return (candidatos ?? []).find(c =>
    c.elegivel === true && c.disponivel === true &&
    c.conviteAtivo !== true && c.bloqueado !== true
  ) ?? null;
}

/**
 * Sugere distribuição do saldo ainda não executado.
 * Cada viagem é atribuída ao motorista elegível que ficará com menor razão
 * (toneladas projetadas / capacidade). Empates preservam a ordem recebida.
 * Não persiste nem aprova a sugestão.
 */
export function sugerirRedistribuicao({ viagensPendentes, motoristas }) {
  const elegiveis = (motoristas ?? []).filter(m =>
    m.elegivel === true && m.disponivel === true &&
    Number(m.capacidadeToneladas) > 0
  ).map(m => ({ ...m, toneladasSugeridas: Number(m.toneladasJaAlocadas ?? 0), viagensSugeridas: 0 }));
  if (!Array.isArray(viagensPendentes) || elegiveis.length === 0) {
    return { possivel: viagensPendentes?.length === 0, sugestoes: [], naoAlocadas: [...(viagensPendentes ?? [])] };
  }
  const sugestoes = [];
  const naoAlocadas = [];
  for (const viagem of viagensPendentes) {
    const volume = Number(viagem.volumeToneladas);
    if (!(volume > 0)) { naoAlocadas.push({ ...viagem, motivo: 'VOLUME_INVALIDO' }); continue; }
    const escolhido = elegiveis
      .filter(m => m.limiteToneladas == null || m.toneladasSugeridas + volume <= Number(m.limiteToneladas))
      .sort((a, b) =>
        (a.toneladasSugeridas / Number(a.capacidadeToneladas)) -
        (b.toneladasSugeridas / Number(b.capacidadeToneladas))
      )[0];
    if (!escolhido) { naoAlocadas.push({ ...viagem, motivo: 'SEM_CAPACIDADE_ELEGIVEL' }); continue; }
    escolhido.toneladasSugeridas += volume;
    escolhido.viagensSugeridas += 1;
    sugestoes.push({ viagemId: viagem.id, motoristaId: escolhido.id, volumeToneladas: volume });
  }
  return {
    possivel: naoAlocadas.length === 0,
    requerAprovacao: true,
    sugestoes,
    naoAlocadas,
    resumo: elegiveis.map(m => ({
      motoristaId: m.id,
      viagensSugeridas: m.viagensSugeridas,
      toneladasSugeridas: m.toneladasSugeridas
    }))
  };
}
