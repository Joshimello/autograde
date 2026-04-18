/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	Deployments: "deployments",
	EmailWhitelist: "email_whitelist",
	Jobs: "jobs",
	Policies: "policies",
	Results: "results",
	Submissions: "submissions",
	Users: "users",
} as const
export type Collections = typeof Collections[keyof typeof Collections]

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export const DeploymentsStatusOptions = {
	"queued": "queued",
	"building": "building",
	"deployed": "deployed",
	"failed": "failed",
} as const
export type DeploymentsStatusOptions = typeof DeploymentsStatusOptions[keyof typeof DeploymentsStatusOptions]
export type DeploymentsRecord = {
	deployedAt?: IsoDateString
	id: string
	message?: string
	status: DeploymentsStatusOptions
	submission: RecordIdString
	url?: string
}

export type EmailWhitelistRecord = {
	active?: boolean
	email: string
	id: string
	notes?: string
}

export const JobsTypeOptions = {
	"grading": "grading",
	"deployment": "deployment",
} as const
export type JobsTypeOptions = typeof JobsTypeOptions[keyof typeof JobsTypeOptions]

export const JobsStatusOptions = {
	"queued": "queued",
	"running": "running",
	"succeeded": "succeeded",
	"failed": "failed",
	"canceled": "canceled",
} as const
export type JobsStatusOptions = typeof JobsStatusOptions[keyof typeof JobsStatusOptions]
export type JobsRecord = {
	finishedAt?: IsoDateString
	id: string
	message?: string
	progress?: number
	startedAt?: IsoDateString
	status: JobsStatusOptions
	submission: RecordIdString
	type: JobsTypeOptions
}

export type PoliciesRecord<Tcriteria = unknown> = {
	active?: boolean
	criteria: null | Tcriteria
	description?: string
	id: string
	name: string
}

export type ResultsRecord<TrubricResults = unknown> = {
	feedback?: string
	id: string
	maxScore?: number
	policy: RecordIdString
	rubricResults?: null | TrubricResults
	score?: number
	submission: RecordIdString
}

export const SubmissionsStatusOptions = {
	"pending": "pending",
	"grading": "grading",
	"graded": "graded",
	"failed": "failed",
} as const
export type SubmissionsStatusOptions = typeof SubmissionsStatusOptions[keyof typeof SubmissionsStatusOptions]
export type SubmissionsRecord<TmanualGrades = unknown> = {
	archive: FileNameString
	id: string
	label: string
	manualGrades?: null | TmanualGrades
	manualScore?: number
	policy: RecordIdString
	status: SubmissionsStatusOptions
}

export type UsersRecord = {
	allowed?: boolean
	avatar?: FileNameString
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type DeploymentsResponse<Texpand = unknown> = Required<DeploymentsRecord> & BaseSystemFields<Texpand>
export type EmailWhitelistResponse<Texpand = unknown> = Required<EmailWhitelistRecord> & BaseSystemFields<Texpand>
export type JobsResponse<Texpand = unknown> = Required<JobsRecord> & BaseSystemFields<Texpand>
export type PoliciesResponse<Tcriteria = unknown, Texpand = unknown> = Required<PoliciesRecord<Tcriteria>> & BaseSystemFields<Texpand>
export type ResultsResponse<TrubricResults = unknown, Texpand = unknown> = Required<ResultsRecord<TrubricResults>> & BaseSystemFields<Texpand>
export type SubmissionsResponse<TmanualGrades = unknown, Texpand = unknown> = Required<SubmissionsRecord<TmanualGrades>> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	deployments: DeploymentsRecord
	email_whitelist: EmailWhitelistRecord
	jobs: JobsRecord
	policies: PoliciesRecord
	results: ResultsRecord
	submissions: SubmissionsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	deployments: DeploymentsResponse
	email_whitelist: EmailWhitelistResponse
	jobs: JobsResponse
	policies: PoliciesResponse
	results: ResultsResponse
	submissions: SubmissionsResponse
	users: UsersResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
