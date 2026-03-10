package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Deck struct {
	ent.Schema
}

func (Deck) Fields() []ent.Field {
	return []ent.Field{
		field.Int("user_id"),
		field.String("name").
			NotEmpty(),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Deck) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("decks").
			Unique().
			Required().
			Field("user_id"),
		edge.To("cards", Card.Type),
	}
}
