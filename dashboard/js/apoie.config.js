// CUSTAVA QUANTO? — configuração do apoio por Pix.
//
// >>> É AQUI que se coloca a chave Pix real. Nenhum outro arquivo precisa mudar. <<<
//
// A chave Pix é feita para ser divulgada (é o que aparece no QR Code de qualquer
// recebedor): não é segredo. NUNCA coloque aqui senhas, tokens, chaves de API ou
// credenciais de conta — este arquivo é público, servido como qualquer outro do site.
//
// Enquanto PIX_KEY ou MERCHANT_NAME começarem com "COLOQUE_", a página mostra
// "Chave Pix ainda não configurada." e NÃO gera QR Code nem Pix Copia e Cola: nenhuma
// chave de exemplo é usada para montar um código de pagamento.

// Chave Pix: CPF ou CNPJ (só dígitos), e-mail, celular no formato +5511999998888
// ou chave aleatória (UUID). Até 77 caracteres.
export const PIX_KEY = "COLOQUE_SUA_CHAVE_PIX_AQUI";

// Nome do recebedor como no cadastro da conta. Até 25 caracteres; o código remove
// acentos e usa maiúsculas, como o padrão do BR Code exige.
export const MERCHANT_NAME = "COLOQUE_O_NOME_DO_RECEBEDOR";

// Cidade do recebedor. Até 15 caracteres, sem acentos. Confirme se é a cidade correta.
export const MERCHANT_CITY = "CAMPINAS";
