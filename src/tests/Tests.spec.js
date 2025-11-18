import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Definindo as métricas
export const getContactsDuration = new Trend('get_contacts', true);
export const RateContentOK = new Rate('content_OK');

// Configurações de opções, incluindo o rampa e thresholds
export const options = {
  thresholds: {
    // 90% das requisições devem ter tempo abaixo de 6800ms
    get_contacts: ['p(90)<6800'],
    // Menos de 25% das requisições devem falhar
    http_req_failed: ['rate<0.25'],
    // Threshold para a taxa de respostas OK (status 200)
    content_OK: ['rate>0.75']
  },
  stages: [
    // Ramp-up de VUs: 7 VUs no início e indo até 92 VUs ao longo de 3,5 minutos
    { duration: '1m', target: 7 },   // 1 minuto para 7 VUs
    { duration: '1m', target: 30 },  // 1 minuto para 30 VUs
    { duration: '1m', target: 60 },  // 1 minuto para 60 VUs
    { duration: '30s', target: 92 }, // 30 segundos para chegar até 92 VUs
  ],
};

// Função para gerar o relatório de resumo
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

// Função principal de execução
export default function () {
  // API URL
  const baseUrl = 'https://swapi.dev/api/people/1/';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const res = http.get(`${baseUrl}`, params);

  // Medindo o tempo de resposta
  getContactsDuration.add(res.timings.duration);

  // Validando o status da resposta (200)
  RateContentOK.add(res.status === OK);

  // Validando que a requisição retornou com sucesso (status 200)
  check(res, {
    'GET Contacts - Status 200': () => res.status === OK,
  });
}
