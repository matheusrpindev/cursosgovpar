
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "aceites_termos": {
                  Row: {
                    "aceito_em": string,"documento": Database["public"]['Enums']["documento_legal"],"id": number,"perfil_id": string,"versao": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aceito_em"?: string,"documento": Database["public"]['Enums']["documento_legal"],"id"?: never,"perfil_id": string,"versao": number
                  }
                  Update: {
                    "aceito_em"?: string,"documento"?: Database["public"]['Enums']["documento_legal"],"id"?: never,"perfil_id"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "aceites_termos_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"auditoria": {
                  Row: {
                    "acao": string,"alvo_perfil_id": string | null,"ator_id": string | null,"criado_em": string,"detalhes": NonNullable<Json>,"id": number,"organizacao_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"alvo_perfil_id"?: string | null,"ator_id"?: string | null,"criado_em"?: string,"detalhes"?: NonNullable<Json>,"id"?: never,"organizacao_id"?: string | null
                  }
                  Update: {
                    "acao"?: string,"alvo_perfil_id"?: string | null,"ator_id"?: string | null,"criado_em"?: string,"detalhes"?: NonNullable<Json>,"id"?: never,"organizacao_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "auditoria_alvo_perfil_id_fkey"
      columns: ["alvo_perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auditoria_ator_id_fkey"
      columns: ["ator_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auditoria_organizacao_id_fkey"
      columns: ["organizacao_id"]
isOneToOne: false
      referencedRelation: "organizacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"aulas": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"curso_id": string,"descricao": string,"exigir_video_completo": boolean,"id": string,"ordem": number,"titulo": string,"video_hash": string | null,"video_id": string,"video_provedor": Database["public"]['Enums']["provedor_video"]
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"curso_id": string,"descricao"?: string,"exigir_video_completo"?: boolean,"id"?: string,"ordem": number,"titulo": string,"video_hash"?: string | null,"video_id": string,"video_provedor": Database["public"]['Enums']["provedor_video"]
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"curso_id"?: string,"descricao"?: string,"exigir_video_completo"?: boolean,"id"?: string,"ordem"?: number,"titulo"?: string,"video_hash"?: string | null,"video_id"?: string,"video_provedor"?: Database["public"]['Enums']["provedor_video"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "aulas_curso_id_fkey"
      columns: ["curso_id"]
isOneToOne: false
      referencedRelation: "cursos"
      referencedColumns: ["id"]
    }
                  ]
                },"certificados": {
                  Row: {
                    "codigo": string,"curso_id": string,"dados": NonNullable<Json>,"emitido_em": string,"id": string,"motivo_revogacao": string | null,"organizacao_id": string | null,"pdf_path": string | null,"perfil_id": string | null,"revogado_em": string | null,"revogado_por": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"curso_id": string,"dados": NonNullable<Json>,"emitido_em"?: string,"id"?: string,"motivo_revogacao"?: string | null,"organizacao_id"?: string | null,"pdf_path"?: string | null,"perfil_id"?: string | null,"revogado_em"?: string | null,"revogado_por"?: string | null
                  }
                  Update: {
                    "codigo"?: string,"curso_id"?: string,"dados"?: NonNullable<Json>,"emitido_em"?: string,"id"?: string,"motivo_revogacao"?: string | null,"organizacao_id"?: string | null,"pdf_path"?: string | null,"perfil_id"?: string | null,"revogado_em"?: string | null,"revogado_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificados_curso_id_fkey"
      columns: ["curso_id"]
isOneToOne: false
      referencedRelation: "cursos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificados_organizacao_id_fkey"
      columns: ["organizacao_id"]
isOneToOne: false
      referencedRelation: "organizacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificados_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificados_revogado_por_fkey"
      columns: ["revogado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"configuracoes": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"cadastro_lista_publica": boolean,"cert_assinatura_path": string | null,"cert_cpf_completo": boolean,"cert_frase": string,"cert_prefixo_codigo": string,"cert_responsavel_cargo": string,"cert_responsavel_nome": string,"cert_titulo": string,"cor_primaria": string,"cor_secundaria": string,"email_contato": string | null,"favicon_path": string | null,"id": number,"logo_path": string | null,"nome_empresa": string,"nome_plataforma": string,"politica_privacidade": string,"termos_uso": string,"termos_versao": number,"texto_rodape": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cadastro_lista_publica"?: boolean,"cert_assinatura_path"?: string | null,"cert_cpf_completo"?: boolean,"cert_frase"?: string,"cert_prefixo_codigo"?: string,"cert_responsavel_cargo"?: string,"cert_responsavel_nome"?: string,"cert_titulo"?: string,"cor_primaria"?: string,"cor_secundaria"?: string,"email_contato"?: string | null,"favicon_path"?: string | null,"id"?: number,"logo_path"?: string | null,"nome_empresa"?: string,"nome_plataforma"?: string,"politica_privacidade"?: string,"termos_uso"?: string,"termos_versao"?: number,"texto_rodape"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cadastro_lista_publica"?: boolean,"cert_assinatura_path"?: string | null,"cert_cpf_completo"?: boolean,"cert_frase"?: string,"cert_prefixo_codigo"?: string,"cert_responsavel_cargo"?: string,"cert_responsavel_nome"?: string,"cert_titulo"?: string,"cor_primaria"?: string,"cor_secundaria"?: string,"email_contato"?: string | null,"favicon_path"?: string | null,"id"?: number,"logo_path"?: string | null,"nome_empresa"?: string,"nome_plataforma"?: string,"politica_privacidade"?: string,"termos_uso"?: string,"termos_versao"?: number,"texto_rodape"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cursos": {
                  Row: {
                    "atualizado_em": string,"capa_path": string | null,"carga_horaria": number,"criado_em": string,"descricao": string,"id": string,"status": Database["public"]['Enums']["status_curso"],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"capa_path"?: string | null,"carga_horaria": number,"criado_em"?: string,"descricao"?: string,"id"?: string,"status"?: Database["public"]['Enums']["status_curso"],"titulo": string
                  }
                  Update: {
                    "atualizado_em"?: string,"capa_path"?: string | null,"carga_horaria"?: number,"criado_em"?: string,"descricao"?: string,"id"?: string,"status"?: Database["public"]['Enums']["status_curso"],"titulo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"organizacao_cursos": {
                  Row: {
                    "curso_id": string,"liberado_em": string,"liberado_por": string | null,"organizacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "curso_id": string,"liberado_em"?: string,"liberado_por"?: string | null,"organizacao_id": string
                  }
                  Update: {
                    "curso_id"?: string,"liberado_em"?: string,"liberado_por"?: string | null,"organizacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organizacao_cursos_curso_id_fkey"
      columns: ["curso_id"]
isOneToOne: false
      referencedRelation: "cursos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organizacao_cursos_liberado_por_fkey"
      columns: ["liberado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organizacao_cursos_organizacao_id_fkey"
      columns: ["organizacao_id"]
isOneToOne: false
      referencedRelation: "organizacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"organizacoes": {
                  Row: {
                    "ativo": boolean,"criado_em": string,"id": string,"nome": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"criado_em"?: string,"id"?: string,"nome": string,"slug": string
                  }
                  Update: {
                    "ativo"?: boolean,"criado_em"?: string,"id"?: string,"nome"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"perfis": {
                  Row: {
                    "anonimizado_em": string | null,"aprovado_em": string | null,"aprovado_por": string | null,"atualizado_em": string,"cpf_mascarado": string | null,"criado_em": string,"email": string,"email_confirmado_em": string | null,"id": string,"motivo_recusa": string | null,"nome": string,"notificado_em": string | null,"organizacao_id": string | null,"papel": Database["public"]['Enums']["papel"],"status": Database["public"]['Enums']["status_perfil"]
                  }
                  ComputedFields: never
                  Insert: {
                    "anonimizado_em"?: string | null,"aprovado_em"?: string | null,"aprovado_por"?: string | null,"atualizado_em"?: string,"cpf_mascarado"?: string | null,"criado_em"?: string,"email": string,"email_confirmado_em"?: string | null,"id": string,"motivo_recusa"?: string | null,"nome": string,"notificado_em"?: string | null,"organizacao_id"?: string | null,"papel"?: Database["public"]['Enums']["papel"],"status"?: Database["public"]['Enums']["status_perfil"]
                  }
                  Update: {
                    "anonimizado_em"?: string | null,"aprovado_em"?: string | null,"aprovado_por"?: string | null,"atualizado_em"?: string,"cpf_mascarado"?: string | null,"criado_em"?: string,"email"?: string,"email_confirmado_em"?: string | null,"id"?: string,"motivo_recusa"?: string | null,"nome"?: string,"notificado_em"?: string | null,"organizacao_id"?: string | null,"papel"?: Database["public"]['Enums']["papel"],"status"?: Database["public"]['Enums']["status_perfil"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfis_aprovado_por_fkey"
      columns: ["aprovado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "perfis_organizacao_id_fkey"
      columns: ["organizacao_id"]
isOneToOne: false
      referencedRelation: "organizacoes"
      referencedColumns: ["id"]
    }
                  ]
                },"perfis_privados": {
                  Row: {
                    "cpf": string | null,"perfil_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cpf"?: string | null,"perfil_id": string
                  }
                  Update: {
                    "cpf"?: string | null,"perfil_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfis_privados_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: true
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"progresso_aulas": {
                  Row: {
                    "aula_id": string,"concluida_em": string,"perfil_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aula_id": string,"concluida_em"?: string,"perfil_id": string
                  }
                  Update: {
                    "aula_id"?: string,"concluida_em"?: string,"perfil_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "progresso_aulas_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progresso_aulas_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "aceitar_termos_atuais":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"emitir_certificado":
{ Args: { "p_curso": string }; Returns: {
              "codigo": string,
"curso_id": string,
"dados": NonNullable<Json>,
"emitido_em": string,
"id": string,
"motivo_revogacao": string | null,
"organizacao_id": string | null,
"pdf_path": string | null,
"perfil_id": string | null,
"revogado_em": string | null,
"revogado_por": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "certificados"
        isOneToOne: true
        isSetofReturn: false
      } },
"mover_aula":
{ Args: { "p_aula": string,"p_sobe": boolean }; Returns: undefined
                           },
"orgao_para_cadastro":
{ Args: { "p_slug": string }; Returns: {
              "id": string,"nome": string
            }[]
                           },
"orgaos_para_cadastro":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"nome": string,"slug": string
            }[]
                           },
"reenviar_solicitacao":
{ Args: { "p_nome": string,"p_slug"?: string }; Returns: undefined
                           },
"validar_certificado":
{ Args: { "p_codigo": string }; Returns: {
              "carga_horaria": string,"codigo": string,"curso": string,"data_conclusao": string,"emitido_em": string,"nome": string,"orgao": string,"valido": boolean
            }[]
                           }
          }
          Enums: {
            "documento_legal": "termos_uso"|"politica_privacidade","papel": "admin"|"gestor"|"aluno","provedor_video": "youtube"|"vimeo","status_curso": "rascunho"|"publicado","status_perfil": "pendente"|"aprovado"|"recusado"|"desativado"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "documento_legal": ["termos_uso", "politica_privacidade"],"papel": ["admin", "gestor", "aluno"],"provedor_video": ["youtube", "vimeo"],"status_curso": ["rascunho", "publicado"],"status_perfil": ["pendente", "aprovado", "recusado", "desativado"]
          }
        }
} as const
