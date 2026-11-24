import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('./httpClient', () => ({
  apiRequest: mocks.apiRequest,
  apiPost: mocks.apiPost,
  apiPatch: mocks.apiPatch,
  apiPut: mocks.apiPut,
  apiDelete: mocks.apiDelete,
}))

import {
  activarEmpresa,
  borrarGrupo,
  cambiarRolIntegrante,
  crearGrupo,
  enviarMensajeEmpresa,
  fijarEmpresasGrupo,
  fijarOperadoresGrupo,
  listarGrupos,
  listarIntegrantes,
  listarOperadores,
  reactivarEmpresa,
  renombrarGrupo,
  suspenderEmpresa,
  crearUsuarioPlataforma,
  getMe,
  listarEmpresasPlataforma,
  rechazarEmpresa,
  registrarEmpresa,
  resolverEmpresaPorRut,
  solicitarAcceso,
} from './identityService'

const tenantApi = {
  id: 't-9', nombre_empresa: 'Acme', slug: 'acme', activo: false, estado: 'PENDIENTE_ACTIVACION',
  rut_empresa: '76086428-5', razon_social: 'Acme SpA', registrado_por_email: 'a@gmail.com', cognito_error: null,
}
const tenant = {
  id: 't-9', nombreEmpresa: 'Acme', slug: 'acme', activo: false, estado: 'PENDIENTE_ACTIVACION',
  rutEmpresa: '76086428-5', razonSocial: 'Acme SpA', registradoPorEmail: 'a@gmail.com', cognitoError: null, grupo: null,
}

describe('identityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('solicitarAcceso y resolver usan rut', async () => {
    mocks.apiPost.mockResolvedValue({ datos: { id: 'u-1', email: 'b@gmail.com', nombre: 'B', rol: 'Trabajador', estado: 'PENDIENTE' } })
    mocks.apiRequest.mockResolvedValue({ datos: { existe: true, slug: 'acme', nombre_empresa: 'Acme' } })
    await solicitarAcceso({ rutEmpresa: '76086428-5' })
    expect(mocks.apiPost).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/access-requests$/), { rut_empresa: '76086428-5' })
    const r = await resolverEmpresaPorRut('76.086.428-5')
    expect(mocks.apiRequest).toHaveBeenCalledWith(expect.stringContaining('/tenants/resolver?rut=76.086.428-5'), { public: true })
    expect(r).toEqual({ existe: true, slug: 'acme', nombreEmpresa: 'Acme' })
  })

  it('getMe mapea tenant_estado y tenant_nombre', async () => {
    mocks.apiRequest.mockResolvedValue({ datos: {
      user_id: null, tenant_id: null, email: 'a@gmail.com', nombre: 'A', role: null, trabajador_id: null,
      cognito_sub: 's', estado: 'PENDIENTE', codigo: null, pendiente: true, tenant_slug: 'acme',
      tenant_estado: 'PENDIENTE_ACTIVACION', tenant_nombre: 'Acme',
    } })
    const me = await getMe()
    expect(me.tenantEstado).toBe('PENDIENTE_ACTIVACION')
    expect(me.tenantNombre).toBe('Acme')
  })

  it('getMe tolera respuestas sin tenant_estado', async () => {
    mocks.apiRequest.mockResolvedValue({ datos: { user_id: 'u', tenant_id: 't', email: 'a', nombre: null, role: 'Trabajador', trabajador_id: null, cognito_sub: null, estado: 'ACTIVO', codigo: null, pendiente: false, tenant_slug: 'acme' } })
    const me = await getMe()
    expect(me.tenantEstado).toBeNull()
    expect(me.tenantNombre).toBeNull()
  })

  it('registrarEmpresa envía snake_case y mapea la respuesta', async () => {
    mocks.apiPost.mockResolvedValue({ datos: tenantApi })
    const r = await registrarEmpresa({
      razonSocial: 'Acme SpA', nombreFantasia: 'Acme', rutEmpresa: '76.086.428-5', giro: 'Servicios',
      codigoActividad: '', direccionCalle: 'Av', direccionNumero: '1', comuna: 'Santiago', region: 'RM',
      emailContacto: 'c@acme.cl', telefonoContacto: '', representanteNombre: 'Rita', representanteRut: '11.111.111-1',
      aceptaTerminos: true,
    })
    expect(mocks.apiPost).toHaveBeenCalledWith(expect.stringMatching(/\/tenants$/), {
      razon_social: 'Acme SpA', nombre_fantasia: 'Acme', rut_empresa: '76.086.428-5', giro: 'Servicios',
      codigo_actividad: null, direccion_calle: 'Av', direccion_numero: '1', comuna: 'Santiago', region: 'RM',
      email_contacto: 'c@acme.cl', telefono_contacto: null, representante_nombre: 'Rita', representante_rut: '11.111.111-1',
      acepta_terminos: true,
    })
    expect(r).toEqual(tenant)
  })

  it('listarEmpresasPlataforma filtra por estado solo si viene', async () => {
    mocks.apiRequest.mockResolvedValue({ datos: [tenantApi] })
    expect(await listarEmpresasPlataforma('PENDIENTE_ACTIVACION')).toEqual([tenant])
    expect(mocks.apiRequest).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants\?estado=PENDIENTE_ACTIVACION$/))
    await listarEmpresasPlataforma()
    expect(mocks.apiRequest).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants$/))
  })

  it('activar y rechazar empresa', async () => {
    mocks.apiPost.mockResolvedValue({ datos: { ...tenantApi, estado: 'ACTIVO', activo: true } })
    expect((await activarEmpresa('t-9')).estado).toBe('ACTIVO')
    expect(mocks.apiPost).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants\/t-9\/activar$/), {})
    mocks.apiPost.mockResolvedValue({ datos: { ...tenantApi, estado: 'RECHAZADO' } })
    expect((await rechazarEmpresa('t-9', 'Datos falsos')).estado).toBe('RECHAZADO')
    expect(mocks.apiPost).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants\/t-9\/rechazar$/), { motivo: 'Datos falsos' })
  })

  it('crearUsuarioPlataforma envía tenant_id null para OperadorSaaS', async () => {
    mocks.apiPost.mockResolvedValue({ datos: { id: 'u-2', tenant_id: null, email: 's@rrhh.cl', nombre: 'S', rol: 'OperadorSaaS', estado: 'ACTIVO' } })
    const u = await crearUsuarioPlataforma({ email: 's@rrhh.cl', nombre: 'S', rol: 'OperadorSaaS' })
    expect(mocks.apiPost).toHaveBeenCalledWith(expect.stringMatching(/\/plataforma\/usuarios$/), { email: 's@rrhh.cl', nombre: 'S', rol: 'OperadorSaaS', tenant_id: null })
    expect(u.rol).toBe('OperadorSaaS')
    await crearUsuarioPlataforma({ email: 'x@acme.cl', nombre: 'X', rol: 'SuperAdmin', tenantId: 't-9' })
    expect(mocks.apiPost).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/usuarios$/), { email: 'x@acme.cl', nombre: 'X', rol: 'SuperAdmin', tenant_id: 't-9' })
  })

  it('normalizaTenantSinGrupo', async () => {
    mocks.apiRequest.mockResolvedValue({ datos: [tenantApi, { ...tenantApi, id: 't-8', grupo: 'Sur' }] })
    const [sinGrupo, conGrupo] = await listarEmpresasPlataforma()
    expect(sinGrupo.grupo).toBeNull()
    expect(conGrupo.grupo).toBe('Sur')
  })

  it('gruposUsanSusRutas', async () => {
    const grupoApi = { id: 'g-1', nombre: 'Sur', tenant_ids: ['t-1'], operador_ids: ['op-1'] }
    const grupo = { id: 'g-1', nombre: 'Sur', tenantIds: ['t-1'], operadorIds: ['op-1'] }
    mocks.apiRequest.mockResolvedValue({ datos: [grupoApi] })
    expect(await listarGrupos()).toEqual([grupo])
    expect(mocks.apiRequest).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/grupos$/))
    mocks.apiPost.mockResolvedValue({ datos: grupoApi })
    expect(await crearGrupo('Sur')).toEqual(grupo)
    expect(mocks.apiPost).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/grupos$/), { nombre: 'Sur' })
    mocks.apiPatch.mockResolvedValue({ datos: { ...grupoApi, nombre: 'Norte' } })
    expect((await renombrarGrupo('g-1', 'Norte')).nombre).toBe('Norte')
    expect(mocks.apiPatch).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/grupos\/g-1$/), { nombre: 'Norte' })
    mocks.apiPut.mockResolvedValue({ datos: grupoApi })
    await fijarEmpresasGrupo('g-1', ['t-1'])
    expect(mocks.apiPut).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/grupos\/g-1\/empresas$/), { ids: ['t-1'] })
    await fijarOperadoresGrupo('g-1', ['op-1'])
    expect(mocks.apiPut).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/grupos\/g-1\/operadores$/), { ids: ['op-1'] })
    mocks.apiDelete.mockResolvedValue(undefined)
    await borrarGrupo('g-1')
    expect(mocks.apiDelete).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/grupos\/g-1$/))
  })

  it('accionesDeEmpresaUsanSusRutas', async () => {
    const usuarioApi = { id: 'u-1', tenant_id: 't-1', email: 't@x.cl', nombre: 'T', rol: 'Jefatura', estado: 'ACTIVO' }
    mocks.apiRequest.mockResolvedValue({ datos: [usuarioApi] })
    expect((await listarIntegrantes('t-1'))[0].email).toBe('t@x.cl')
    expect(mocks.apiRequest).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants\/t-1\/usuarios$/))
    await listarOperadores()
    expect(mocks.apiRequest).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/operadores$/))
    mocks.apiPatch.mockResolvedValue({ datos: usuarioApi })
    expect((await cambiarRolIntegrante('t-1', 'u-1', 'Jefatura')).rol).toBe('Jefatura')
    expect(mocks.apiPatch).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants\/t-1\/usuarios\/u-1\/rol$/), { rol: 'Jefatura' })
    mocks.apiPost.mockResolvedValue({ datos: { ...tenantApi, estado: 'SUSPENDIDO' } })
    expect((await suspenderEmpresa('t-1', 'Impago')).estado).toBe('SUSPENDIDO')
    expect(mocks.apiPost).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants\/t-1\/suspender$/), { motivo: 'Impago' })
    mocks.apiPost.mockResolvedValue({ datos: { ...tenantApi, estado: 'ACTIVO' } })
    await reactivarEmpresa('t-1')
    expect(mocks.apiPost).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants\/t-1\/reactivar$/), {})
    mocks.apiPost.mockResolvedValue({ datos: { destinatarios: 2 } })
    expect(await enviarMensajeEmpresa('t-1', 'A', 'B')).toBe(2)
    expect(mocks.apiPost).toHaveBeenLastCalledWith(expect.stringMatching(/\/plataforma\/tenants\/t-1\/mensajes$/), { asunto: 'A', cuerpo: 'B' })
  })
})
