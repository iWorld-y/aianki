package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type ReviewLog struct {
	ent.Schema
}

func (ReviewLog) Fields() []ent.Field {
	return []ent.Field{
		field.Int("user_id"),
		field.Int("card_id"),
		field.Int("rating").
			Min(1).
			Max(4),
		field.Enum("review_mode").
			Values("self_rate", "ai_judge"),
		field.String("user_answer").
			Optional().
			Nillable(),
		field.Bool("ai_correct").
			Optional().
			Nillable(),
		field.Time("reviewed_at").
			Default(time.Now),
	}
}

func (ReviewLog) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("review_logs").
			Unique().
			Required().
			Field("user_id"),
		edge.From("card", Card.Type).
			Ref("review_logs").
			Unique().
			Required().
			Field("card_id"),
	}
}
